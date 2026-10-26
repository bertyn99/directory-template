#!/usr/bin/env bash
#
# Sync a scrubbed snapshot of the PRODUCTION database into the local DEV database.
#
#   DATABASE_URL      = dev DB  (target — wiped then refilled)
#   DATABASE_URL_PROD = prod DB (source — read-only)
#
# Flow:
#   1. Check the 24 app tables exist on both DBs
#   2. TRUNCATE every app table on dev — RESTART IDENTITY CASCADE
#      (content wiped + SERIAL sequences reset to 0; FK order handled by CASCADE)
#   3. Copy prod data only (pg_dump --data-only --table=<each>) → restore into dev
#      (drizzle.__drizzle_migrations is NEVER touched — it is not in the table list)
#   4. Scrub PII in dev (sessions, OAuth tokens, emails, stripe ids, avatar)
#   5. Re-advance serial sequences past the new max(id)
#
# Usage:
#   pnpm db:sync-prod            # check → truncate → copy → scrub
#   pnpm db:sync-prod --check    # read-only: row counts on both DBs, no writes
#   pnpm db:sync-prod --yes      # skip the interactive confirmation
#
# Scrubbed in dev (never prod):
#   - sessions table emptied              (prod session tokens are live credentials)
#   - accounts.access_token/refresh_token/id_token → NULL
#   - accounts.hashed_password → argon2 hash of DEV_PASSWORD (default DevPass123!)
#   - users.email → user_<uuid>@dev.local  (guaranteed unique)
#   - users.stripe_customer_id / avatar_url → NULL
#   - subscriptions.stripe_subscription_id → NULL
#
# Names/usernames/venue data are kept as-is: public business data needed for
# realistic dev. Only credentials + contact identifiers are wiped.
#
# Env overrides: DEV_PASSWORD (dev login password for all accounts)

set -euo pipefail

cd "$(dirname "$0")/.."

MODE="restore"
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --check) MODE="check" ;;
    --yes) ASSUME_YES=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

fail() { echo "❌ $*" >&2; exit 1; }
info() { echo "→ $*"; }
ok() { echo "✅ $*"; }

# ---------------------------------------------------------------------------
# Dotenv parser — .env is NOT bash: `NODE_OPTIONS = "--max-old-space-size=4096
# --experimental-require-module"` has spaces around `=` and an unquoted
# multi-word value. `source .env` would run `NODE_OPTIONS` as a command.
# Handles: KEY=value, KEY = value, KEY="quoted value", single/double quotes,
# comments, blanks. Does not override already-set vars.
# ---------------------------------------------------------------------------
read_env() {
  local file="$1" line key value
  [ -f "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line#"${line%%[![:space:]]*}"}"   # strip leading whitespace
    [ -z "$line" ] && continue
    case "$line" in \#*) continue ;; esac      # comment
    key="${line%%=*}"
    value="${line#*=}"
    [ "$key" = "$line" ] && continue           # no '=' → not an assignment
    # trim whitespace around key and value
    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    case "$key" in *[!A-Za-z0-9_]*) continue ;; esac
    # strip surrounding quotes
    if [[ "$value" == \"*\" ]] && [ "${#value}" -ge 2 ]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' ]] && [ "${#value}" -ge 2 ]; then
      value="${value:1:${#value}-2}"
    fi
    if [ -z "${!key:-}" ]; then
      export "$key=$value"
    fi
  done < "$file"
}

read_env .env

DEV_URL="${DATABASE_URL:-}"
PROD_URL="${DATABASE_URL_PROD:-}"

# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------
host_port() {
  local u="$1"
  u="${u#*://}"
  u="${u%%/*}"
  u="${u#*@}"
  echo "$u"
}

dbname() {
  local u="$1"
  u="${u#*://}"
  u="${u##*/}"
  u="${u%%\?*}"
  echo "$u"
}

# ---------------------------------------------------------------------------
# The 24 app tables (physical names, in dependency-light order for display).
# drizzle.__drizzle_migrations is intentionally NOT in this list.
# ---------------------------------------------------------------------------
TABLES=(
  users accounts sessions subscriptions
  countries cities addresses
  types franchises venues
  thematiques activities equipments   # thematiques before activities (FK)
  venue_activities venue_equipments user_venues
  formulas images events reviews
  sources source_countries venue_sources match_candidates
)

SUMMARY_TABLES="
  SELECT 'users' AS table_name, count(*) FROM users
  UNION ALL SELECT 'accounts', count(*) FROM accounts
  UNION ALL SELECT 'sessions', count(*) FROM sessions
  UNION ALL SELECT 'subscriptions', count(*) FROM subscriptions
  UNION ALL SELECT 'venues', count(*) FROM venues
  UNION ALL SELECT 'cities', count(*) FROM cities
  UNION ALL SELECT 'countries', count(*) FROM countries
  UNION ALL SELECT 'activities', count(*) FROM activities
  UNION ALL SELECT 'thematiques', count(*) FROM thematiques
  UNION ALL SELECT 'match_candidates', count(*) FROM match_candidates
"

# ---------------------------------------------------------------------------
# Guards
# ---------------------------------------------------------------------------
[ -n "$PROD_URL" ] || fail "DATABASE_URL_PROD is not set in .env"
[ -n "$DEV_URL" ] || fail "DATABASE_URL is not set in .env"
[ "$PROD_URL" != "$DEV_URL" ] || fail "DATABASE_URL and DATABASE_URL_PROD are identical — refusing."

if [ "$(host_port "$PROD_URL")" = "$(host_port "$DEV_URL")" ] \
  && [ "$(dbname "$PROD_URL")" = "$(dbname "$DEV_URL")" ]; then
  fail "both URLs point to the same database ($(dbname "$PROD_URL")) — refusing."
fi

psql "$PROD_URL" -tAc "SELECT 1" >/dev/null 2>&1 \
  || fail "cannot connect to prod DB ($(host_port "$PROD_URL"))"
psql "$DEV_URL" -tAc "SELECT 1" >/dev/null 2>&1 \
  || fail "cannot connect to dev DB ($(host_port "$DEV_URL"))"

# ---------------------------------------------------------------------------
# Verify all 24 tables exist on BOTH databases
# ---------------------------------------------------------------------------
# Build a VALUES list of single-quoted names for the "missing" query
tables_values_sql() {
  local t first=1 out=""
  for t in "${TABLES[@]}"; do
    if [ "$first" = 1 ]; then first=0; else out+=","; fi
    out+="('$t')"
  done
  printf '%s' "$out"
}

missing_tables() {
  local url="$1"
  psql "$url" -tA -c "
    SELECT v.t FROM (VALUES $(tables_values_sql)) AS v(t)
    WHERE v.t NOT IN (SELECT table_name FROM information_schema.tables WHERE table_schema='public')
    ORDER BY v.t
  " 2>/dev/null | paste -sd' ' -
}

info "checking $((${#TABLES[@]})) tables exist on prod…"
prod_missing="$(missing_tables "$PROD_URL")"
[ -z "$prod_missing" ] || fail "prod is missing tables: $prod_missing"

info "checking $((${#TABLES[@]})) tables exist on dev…"
dev_missing="$(missing_tables "$DEV_URL")"
[ -z "$dev_missing" ] || fail "dev is missing tables: $dev_missing"

# ---------------------------------------------------------------------------
# --check mode: read-only row counts, no writes
# ---------------------------------------------------------------------------
if [ "$MODE" = "check" ]; then
  echo "=== PROD  ($(host_port "$PROD_URL")/$(dbname "$PROD_URL")) ==="
  psql "$PROD_URL" -c "$SUMMARY_TABLES"
  echo "=== DEV  ($(host_port "$DEV_URL")/$(dbname "$DEV_URL")) ==="
  psql "$DEV_URL" -c "$SUMMARY_TABLES"
  ok "check mode — nothing was written."
  exit 0
fi

# ---------------------------------------------------------------------------
# Confirm before wiping dev
# ---------------------------------------------------------------------------
echo "⚠  This WIPES your dev DB ($(host_port "$DEV_URL")/$(dbname "$DEV_URL"))"
echo "   and refills it with a scrubbed snapshot of prod ($(host_port "$PROD_URL")/$(dbname "$PROD_URL"))."
if [ "$ASSUME_YES" != "1" ]; then
  read -r -p "Type 'yes' to continue: " answer
  [ "$answer" = "yes" ] || fail "aborted."
fi

# ---------------------------------------------------------------------------
# 2. Wipe dev: terminate connections, then TRUNCATE all app tables
#    RESTART IDENTITY = SERIAL sequences reset to 1; CASCADE handles FKs
# ---------------------------------------------------------------------------
DEV_DB="$(dbname "$DEV_URL")"
info "terminating connections on dev DB ($DEV_DB)…"
psql "$DEV_URL" -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE datname = '$DEV_DB' AND pid <> pg_backend_pid()" >/dev/null 2>&1 || true

info "truncating all app tables on dev (RESTART IDENTITY CASCADE)…"
TRUNCATE_LIST=$(printf '"%s",' "${TABLES[@]}")
TRUNCATE_LIST="${TRUNCATE_LIST%,}"
psql "$DEV_URL" -c "TRUNCATE $TRUNCATE_LIST RESTART IDENTITY CASCADE;"

# ---------------------------------------------------------------------------
# 3. Copy prod data → dev via psql COPY piping (no pg_dump needed — avoids
#    client/server version mismatch). FK order handled by TABLES array ordering.
# ---------------------------------------------------------------------------
info "copying data from prod → dev (24 tables)…"
for t in "${TABLES[@]}"; do
  rows=$(psql "$PROD_URL" -tAc "SELECT count(*) FROM \"$t\"")
  if [ "$rows" = "0" ]; then
    info "  $t (empty — skipped)"
    continue
  fi
  info "  $t ($rows rows)"
  # Fetch dev column names — exclude generated columns (slugs auto-compute on
  # insert) and align by name not ordinal (prod/dev column order can drift).
  cols=$(psql "$DEV_URL" -tA -c "SELECT string_agg('\"' || column_name || '\"', ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='$t' AND is_generated <> 'ALWAYS'")
  psql "$PROD_URL" -c "COPY (SELECT $cols FROM \"$t\") TO stdout" \
      | psql "$DEV_URL" -c "COPY \"$t\"($cols) FROM stdin" \
      || fail "failed to copy table: $t"
done

# Advance serial sequences past the new max(id) — TRUNCATE RESTART IDENTITY
# reset them to 1, COPY inserted rows with prod IDs, now re-assert max+1.
info "advancing serial sequences past max(id)…"
psql "$DEV_URL" <<'SQL'
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, c.relname AS tbl, a.attname AS col,
           pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) AS seq
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) IS NOT NULL
  LOOP
    EXECUTE format(
      'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I.%I), 0) + 1, false)',
      r.seq, r.col, r.schema, r.tbl
    );
  END LOOP;
END $$;
SQL

# ---------------------------------------------------------------------------
# 4. Scrub PII
# ---------------------------------------------------------------------------
info "scrubbing PII…"

# Generate a fresh argon2 hash for the dev password using the app's own helper.
# Best-effort: if it fails, credentials keep prod hashes (you just can't log in).
DEV_PASSWORD="${DEV_PASSWORD:-DevPass123!}"
DEV_PASSWORD_HASH=""
if [ -f server/utils/auth/password.ts ] && command -v pnpm >/dev/null 2>&1; then
  DEV_PASSWORD_HASH="$(
    DEV_PASSWORD="$DEV_PASSWORD" pnpm exec tsx -e \
      "import { hashPassword } from './server/utils/auth/password.ts'
       hashPassword(process.env.DEV_PASSWORD).then(h => process.stdout.write(h))" \
      2>/dev/null || true
  )"
fi
if [ -n "$DEV_PASSWORD_HASH" ]; then
  ok "dev login password = '$DEV_PASSWORD' for all accounts (argon2 hash generated)"
else
  echo "⚠  could not generate argon2 hash — prod password hashes kept in dev (logins will fail with any password)."
fi

psql "$DEV_URL" -v dev_password_hash="$DEV_PASSWORD_HASH" <<'SQL'
-- live prod session tokens must not leak into dev
DELETE FROM sessions;

-- OAuth provider tokens
UPDATE accounts
   SET access_token = NULL,
       refresh_token = NULL,
       id_token = NULL;

-- emails: unique per user, guaranteed by uuid
UPDATE users
   SET email = 'user_' || replace(id::text, '-', '') || '@dev.local';

UPDATE users SET stripe_customer_id = NULL;
UPDATE users SET avatar_url = NULL;
UPDATE subscriptions SET stripe_subscription_id = NULL;

-- reset all credentials to the known dev hash (where clause = no-op when empty)
UPDATE accounts SET hashed_password = :'dev_password_hash'
  WHERE :'dev_password_hash' <> '';
SQL

# ---------------------------------------------------------------------------
# 5. Verify
# ---------------------------------------------------------------------------
echo ""
echo "=== DEV after sync ($(host_port "$DEV_URL")/$(dbname "$DEV_URL")) ==="
psql "$DEV_URL" -c "$SUMMARY_TABLES"
psql "$DEV_URL" -tAc \
  "SELECT count(*) || ' users scrubbed to @dev.local' FROM users WHERE email LIKE '%@dev.local'" \
  | sed 's/^/✅ /'
psql "$DEV_URL" -tAc "SELECT count(*) || ' sessions (expect 0)' FROM sessions" | sed 's/^/✅ /'

ok "done. Start the dev app with DATABASE_URL=$DEV_URL"
echo "   Login: any account, password '${DEV_PASSWORD}' (accounts with prod hashes kept may not work)."