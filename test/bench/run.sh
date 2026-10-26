#!/usr/bin/env bash
# Unlighthouse bench runner — mobile perf for a representative page set.
#
# Usage:
#   BENCH_SITE=https://example-directory.com BENCH_TARGET=prod ./run.sh
#   BENCH_SITE=http://localhost:3000         BENCH_TARGET=dev  ./run.sh
#
# Output: pagespeed-<target>.json / .md next to this script.
# Requires: a Linux Chrome in ~/.cache/puppeteer (WSL guard below).
set -euo pipefail
cd "$(dirname "$0")"

TARGET="${BENCH_TARGET:-prod}"
SITE="${BENCH_SITE:-https://example-directory.com}"

echo "== bench target: $TARGET ($SITE) =="

# WSL guard: force the Linux puppeteer Chrome (system PATH exposes the Windows
# interop binary via /mnt/c, which puppeteer cannot drive).
LINUX_CHROME=$(find "$HOME/.cache/puppeteer/chrome" -name chrome -type f 2>/dev/null | sort -V | tail -1)
if [ -n "$LINUX_CHROME" ]; then
  export PUPPETEER_EXECUTABLE_PATH="$LINUX_CHROME"
  echo "== using chrome: $LINUX_CHROME =="
fi

# Warm-up: for dev targets the first hit compiles routes on demand (Vite),
# which would poison Lighthouse timings. Harmless for prod.
if [ "$TARGET" = "dev" ]; then
  echo "== warming up dev routes =="
  for p in / /blog /categories /categories/yoga /categories/spa/guide \
           /country /country/france /country/france/paris /venues; do
    curl -s -o /dev/null "http://localhost:3000$p" || true
  done
  sleep 2
fi

echo "== running unlighthouse (mobile, performance-only) =="
BENCH_SITE="$SITE" npx --yes unlighthouse --site "$SITE"

echo "== extracting results =="
BENCH_TARGET="$TARGET" BENCH_SITE="$SITE" node extract.mjs

echo "== done: pagespeed-$TARGET.{json,md} =="
