#!/usr/bin/env bash
# End-to-end smoke test for the reservation backend.
# Requires: the server running (npm run dev) and the DB seeded (npm run seed).
# Usage:  bash test/smoke-test.sh   [BASE_URL]
set -u

BASE="${1:-http://localhost:5000}"
PASS=0
FAIL=0

# jget <json> <path>   -> prints a field using node (no jq dependency)
jget() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{let o=JSON.parse(d);console.log(process.argv[1].split(".").reduce((a,k)=>a&&a[k],o)??"")}catch(e){console.log("")}})' "$2" <<<"$1"; }

# req METHOD PATH [TOKEN] [BODY]  -> sets global HTTP (status) and BODY (response)
req() {
  local method="$1" path="$2" token="${3:-}" body="${4:-}"
  local args=(-s -o /tmp/rrs_body.txt -w '%{http_code}' -X "$method" "$BASE$path" -H 'Content-Type: application/json')
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-d "$body")
  HTTP=$(curl "${args[@]}")
  BODY=$(cat /tmp/rrs_body.txt)
}

# check EXPECTED "label"
check() {
  if [ "$HTTP" = "$1" ]; then
    echo "  PASS [$HTTP] $2"
    PASS=$((PASS+1))
  else
    echo "  FAIL (expected $1, got $HTTP) $2"
    echo "        body: $BODY"
    FAIL=$((FAIL+1))
  fi
}

# Unique email each run so re-running doesn't 409 on register.
CUST_EMAIL="cust_$(date +%s)@example.com"
FUTURE_DATE="2026-12-31"
PAST_DATE="2020-01-01"

echo "== 0. Health check =="
req GET /health
check 200 "GET /health"

echo "== 1. Register + login customer =="
req POST /api/auth/register "" "{\"name\":\"Test Cust\",\"email\":\"$CUST_EMAIL\",\"password\":\"secret123\"}"
check 201 "register customer"
req POST /api/auth/login "" "{\"email\":\"$CUST_EMAIL\",\"password\":\"secret123\"}"
check 200 "login customer"
CUST_TOKEN=$(jget "$BODY" token)
[ -n "$CUST_TOKEN" ] && echo "  captured customer token" || { echo "  ERROR: no customer token"; exit 1; }

echo "== find an available table (capacity>=2) for the slot =="
req GET "/api/tables/available?date=$FUTURE_DATE&timeSlot=19:00&guests=2" "$CUST_TOKEN"
check 200 "GET /api/tables/available"
TABLE_ID=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{let a=JSON.parse(d);let t=a.find(x=>x.capacity>=2&&x.capacity<10);console.log(t?t._id:"")})' <<<"$BODY")
[ -n "$TABLE_ID" ] && echo "  using table _id=$TABLE_ID" || { echo "  ERROR: no table found. Did you run 'npm run seed'?"; exit 1; }

echo "== 2. Create a reservation -> 201 =="
req POST /api/reservations "$CUST_TOKEN" "{\"table\":\"$TABLE_ID\",\"date\":\"$FUTURE_DATE\",\"timeSlot\":\"19:00\",\"guests\":2}"
check 201 "create reservation"

echo "== 3. Double-book same table/date/slot -> 409 =="
req POST /api/reservations "$CUST_TOKEN" "{\"table\":\"$TABLE_ID\",\"date\":\"$FUTURE_DATE\",\"timeSlot\":\"19:00\",\"guests\":2}"
check 409 "double-book conflict"

echo "== 4. Guests > table capacity -> 400 =="
req POST /api/reservations "$CUST_TOKEN" "{\"table\":\"$TABLE_ID\",\"date\":\"$FUTURE_DATE\",\"timeSlot\":\"20:00\",\"guests\":999}"
check 400 "capacity exceeded"

echo "== 5. Past date -> 400 =="
req POST /api/reservations "$CUST_TOKEN" "{\"table\":\"$TABLE_ID\",\"date\":\"$PAST_DATE\",\"timeSlot\":\"19:00\",\"guests\":2}"
check 400 "past date rejected"

echo "== 6. Admin login + list all reservations -> 200 =="
req POST /api/auth/login "" "{\"email\":\"admin@example.com\",\"password\":\"admin1234\"}"
check 200 "login admin"
ADMIN_TOKEN=$(jget "$BODY" token)
[ -n "$ADMIN_TOKEN" ] && echo "  captured admin token" || { echo "  ERROR: no admin token (run 'npm run seed')"; exit 1; }
req GET /api/reservations "$ADMIN_TOKEN"
check 200 "admin GET /api/reservations"

echo "== 7. Customer hits admin route -> 403 =="
req GET /api/reservations "$CUST_TOKEN"
check 403 "customer blocked from admin route"

echo
echo "==================== RESULT: $PASS passed, $FAIL failed ===================="
[ "$FAIL" -eq 0 ]
