#!/usr/bin/env node
/**
 * Extract Lighthouse results from an unlighthouse scan into JSON + Markdown.
 *
 * Unlighthouse v0.18 layout:
 *   .unlighthouse/<host>/<hash>/reports/<route>/lighthouse.json
 *
 * Writes (next to this script):
 *   - pagespeed-<target>.json  (machine-readable)
 *   - pagespeed-<target>.md    (human-readable table)
 *
 * Usage: BENCH_TARGET=prod node extract.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const target = process.env.BENCH_TARGET || 'prod'
const root = join(here, '.unlighthouse')
const expectedHost = process.env.BENCH_SITE ? new URL(process.env.BENCH_SITE).hostname : null

function findReports() {
  const files = []
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop()
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      const full = join(dir, e.name)
      if (!e.isDirectory()) continue
      if (e.name === 'client' || e.name === 'mocked-client' || e.name === 'node_modules') continue
      if (e.name === 'reports') {
        const sub = [full]
        while (sub.length) {
          const d = sub.pop()
          let es
          try {
            es = readdirSync(d, { withFileTypes: true })
          } catch {
            continue
          }
          for (const x of es) {
            const f = join(d, x.name)
            if (x.isDirectory()) sub.push(f)
            else if (x.name === 'lighthouse.json') files.push(f)
          }
        }
      } else {
        stack.push(full)
      }
    }
  }
  return files
}

const round = (v) => Math.round(v ?? 0)
const score = (v) => Math.round((v ?? 0) * 100)

const pages = []
for (const file of findReports()) {
  let r
  try {
    r = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    continue
  }
  const url = r.finalDisplayedUrl || r.requestedUrl
  if (!url) continue
  if (expectedHost && new URL(url).hostname !== expectedHost) continue
  const a = r.audits || {}
  const u = new URL(url)
  const rel = relative(join(root), file)
  // route path = segments between "reports/" and "lighthouse.json"
  const segs = rel.split(/[\\/]/)
  const i = segs.indexOf('reports')
  const route = i === -1 ? '/' : '/' + segs.slice(i + 1, -1).join('/')
  pages.push({
    path: route === '/' ? (u.pathname === '/' ? '/' : u.pathname) : route,
    url,
    score: score(r.categories?.performance?.score),
    fcp: round(a['first-contentful-paint']?.numericValue),
    lcp: round(a['largest-contentful-paint']?.numericValue),
    tbt: round(a['total-blocking-time']?.numericValue),
    cls: +(a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3),
    si: round(a['speed-index']?.numericValue),
    bytes: round(a['total-byte-weight']?.numericValue ?? 0),
  })
}

pages.sort((x, y) => x.path.localeCompare(y.path))

const avg = (key) => Math.round(pages.reduce((s, p) => s + p[key], 0) / (pages.length || 1))
const out = {
  target,
  date: new Date().toISOString(),
  device: 'mobile (Lighthouse default emulation, throttled)',
  pages,
  averages: {
    score: avg('score'),
    fcp: avg('fcp'),
    lcp: avg('lcp'),
    tbt: avg('tbt'),
  },
}

writeFileSync(join(here, `pagespeed-${target}.json`), JSON.stringify(out, null, 2) + '\n')

const md = [
  `# PageSpeed bench — ${target}`,
  ``,
  `- Date: ${out.date}`,
  `- Device: ${out.device}`,
  `- Pages: ${pages.length}`,
  `- Averages: score **${out.averages.score}** · FCP **${out.averages.fcp}ms** · LCP **${out.averages.lcp}ms** · TBT **${out.averages.tbt}ms**`,
  ``,
  `| Path | Score | FCP ms | LCP ms | TBT ms | CLS | SI ms | KB |`,
  `|---|---|---|---|---|---|---|---|`,
  ...pages.map(
    (p) => `| \`${p.path}\` | ${p.score} | ${p.fcp} | ${p.lcp} | ${p.tbt} | ${p.cls} | ${p.si} | ${Math.round(p.bytes / 1024)} |`,
  ),
  ``,
].join('\n')
writeFileSync(join(here, `pagespeed-${target}.md`), md)

console.log(`Wrote pagespeed-${target}.json + .md (${pages.length} pages)`)
