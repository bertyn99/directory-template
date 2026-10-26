#!/usr/bin/env bash
# Launch the enrich:venues task on PRODUCTION (no local dev server needed).
#
# Usage:
#   ./scripts/enrich-prod.sh "<nuxt-session cookie value>" [venueIds...]
#
# The session cookie must belong to an ADMIN account:
#   1. Log in at https://example-directory.com/auth/login as admin
#   2. DevTools → Application → Cookies → example-directory.com
#   3. Copy the value of the "nuxt-session" cookie and pass it as $1
#
# Without venueIds, defaults to the striking-distance backlog (12 venues).
# Venues are processed in chunks of 6 (multi-page scraping is memory-heavy).

set -euo pipefail

COOKIE="${1:?Usage: enrich-prod.sh '<nuxt-session cookie value>' [venueIds...]}"
shift || true

URL="https://example-directory.com/api/admin/tasks/enrich-venues"

if [ "$#" -gt 0 ]; then
  IDS=("$@")
else
  IDS=(1568 2410 2470 2564 2587 2599 2675 2696 2717 2744 2765 2778)
fi

echo "Enriching ${#IDS[@]} venues on production in chunks of 6…"

for ((i = 0; i < ${#IDS[@]}; i += 6)); do
  CHUNK=("${IDS[@]:i:6}")
  ID_LIST=$(IFS=,; echo "${CHUNK[*]}")
  echo "── chunk: ${CHUNK[*]}"
  BODY=$(printf '{"force":true,"locales":["fr","en"],"venueIds":[%s]}' "$ID_LIST")
  curl -sS -X POST "$URL" \
    -H "Content-Type: application/json" \
    -b "nuxt-session=$COOKIE" \
    -d "$BODY" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)['data']
    print(f\"   processed: {d['processed']} · skipped: {d['skipped']} · failed: {d['failed']}\")
    for x in d.get('details', []):
        if x.get('status') != 'processed':
            print(f\"   {x['status'].upper()} {x['venueName']}: {x.get('error','')}\")
except Exception as e:
    print(f'   parse error: {e} — raw response above/below may show auth issues')
"
done

echo "Done. Verify e.g.: https://example-directory.com/venues/kingdom-hq"
