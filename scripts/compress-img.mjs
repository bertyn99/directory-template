#!/usr/bin/env node
/**
 * Recompress oversized static images in place (keeps URLs/filenames).
 *
 * Usage: node scripts/compress-img.mjs <dir> [maxWidth=1600] [quality=80]
 *
 * Why: AI-generated covers ship at 2752x1536 / 2.5-3.9MB raw. Under Lighthouse
 * mobile throttling that is 20-35s of LCP when the cover is the LCP element
 * (audit 2026-09-09, YGG-29). Resize + mozjpeg keeps them sharp at ~10x less.
 */
import sharp from "sharp";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node scripts/compress-img.mjs <dir> [maxWidth=1600] [quality=80]");
  process.exit(1);
}
const maxWidth = Number(process.argv[3] ?? 1600);
const quality = Number(process.argv[4] ?? 80);

const exts = new Set([".jpg", ".jpeg"]);
let before = 0;
let after = 0;
let count = 0;

function walk(d, jobs) {
  for (const entry of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, entry.name);
    if (entry.isDirectory()) {
      walk(p, jobs);
      continue;
    }
    if (!exts.has(extname(entry.name).toLowerCase())) continue;
    jobs.push(
      (async () => {
        const size = statSync(p).size;
        const m = await sharp(p).metadata();
        const pipeline = sharp(p).rotate();
        if (m.width && m.width > maxWidth) pipeline.resize({ width: maxWidth });
        const buf = await pipeline
          .jpeg({ quality, progressive: true, mozjpeg: true })
          .toBuffer();
        if (buf.length < size) {
          writeFileSync(p, buf);
          before += size;
          after += buf.length;
          count += 1;
          console.log(`${(size / 1024).toFixed(0)}KB -> ${(buf.length / 1024).toFixed(0)}KB  ${p}`);
        }
      })().catch((err) => console.error(`SKIP ${p}: ${err.message}`)),
    );
  }
}

const jobs = [];
walk(dir, jobs);
await Promise.all(jobs);
console.log(`\nDone: ${count} images, ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB`);
