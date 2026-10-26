#!/usr/bin/env node
/**
 * Convert/compress images to WebP via libSquoosh (@jsquash) codecs.
 *
 * Usage: node scripts/compress-img-webp.mjs <dir-or-file> [maxWidth=1600] [quality=80] [method=6]
 *
 * - Decodes .jpg/.jpeg/.png sources (sharp resize -> raw RGBA)
 * - Encodes with @jsquash/webp (squooosh's libwebp wasm): quality=80, method=6
 *   (method 6 = slowest/best compression effort)
 * - Writes `<name>.webp` next to the source; source file is left untouched.
 */
import sharp from "sharp";
import { encode } from "@jsquash/webp";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, extname, dirname, basename } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/compress-img-webp.mjs <dir-or-file> [maxWidth=1600] [quality=80] [method=6]");
  process.exit(1);
}
const maxWidth = Number(process.argv[3] ?? 1600);
const quality = Number(process.argv[4] ?? 80);
const method = Number(process.argv[5] ?? 6);

// libSquoosh wasm: emscripten tries to fetch the .wasm relative to its module,
// which fails in plain Node (no file:// fetch). Load the binary explicitly.
// Node >= 16 always ships WASM SIMD, so use the simd build.
const require = createRequire(import.meta.url);
const pkgRoot = dirname(require.resolve("@jsquash/webp"));
const encDir = join(pkgRoot, "codec", "enc");
// root index.js does not re-export init — deep-import encode.js
const { init } = await import(pathToFileURL(join(pkgRoot, "encode.js")).href);
const wasmModule = new WebAssembly.Module(readFileSync(join(encDir, "webp_enc_simd.wasm")));
await init(wasmModule);

const exts = new Set([".jpg", ".jpeg", ".png"]);
const files = [];

function collect(p) {
  const stat = statSync(p);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(p, { withFileTypes: true })) {
      collect(join(p, entry.name));
    }
    return;
  }
  if (exts.has(extname(p).toLowerCase())) files.push(p);
}

collect(target);

let before = 0;
let after = 0;
let count = 0;

const jobs = files.map((p) =>
  (async () => {
    const source = readFileSync(p);
    before += source.length;

    let pipeline = sharp(source).rotate();
    const meta = await pipeline.metadata();
    if (meta.width && meta.width > maxWidth) {
      pipeline = pipeline.resize({ width: maxWidth });
    }
    const { data, info } = await pipeline
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const imageData = {
      data: new Uint8ClampedArray(data),
      width: info.width,
      height: info.height,
      colorSpace: "srgb",
    };
    const webp = await encode(imageData, { quality, method });

    const out = join(dirname(p), `${basename(p, extname(p))}.webp`);
    writeFileSync(out, Buffer.from(webp));
    after += webp.byteLength;
    count += 1;
    console.log(`${(source.length / 1024).toFixed(0)}KB -> ${(webp.byteLength / 1024).toFixed(0)}KB  ${out}`);
  })().catch((err) => console.error(`SKIP ${p}: ${err.message}`)),
);

await Promise.all(jobs);
console.log(`\nDone: ${count} images, ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB (webp q${quality} m${method})`);
