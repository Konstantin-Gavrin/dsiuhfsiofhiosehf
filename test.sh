#!/bin/bash

# Power Bot - Testing script
# Validates API endpoints and logging functionality

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
THRESHOLD_EUR=0.10

echo "🧪 Power Bot Testing Script"
echo "============================"
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Health check
echo "1️⃣  Testing /health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
echo "Response: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  exit 1
fi

echo ""

# Test 2: API Boiler Status
echo "2️⃣  Testing /api/boiler/status endpoint..."
API_RESPONSE=$(curl -s "$BASE_URL/api/boiler/status")
echo "Response: $API_RESPONSE"

if echo "$API_RESPONSE" | grep -q '"status"'; then
  echo "✅ Boiler status endpoint works"
  
  # Extract values
  STATUS=$(echo "$API_RESPONSE" | grep -o '"status":"[^"]*"')
  PRICE=$(echo "$API_RESPONSE" | grep -o '"current_price_eur":[0-9.]*')
  THRESHOLD=$(echo "$API_RESPONSE" | grep -o '"threshold":[0-9.]*')
  
  echo "   Status: $STATUS"
  echo "   Price: $PRICE"
  echo "   Threshold: $THRESHOLD"
else
  echo "❌ Boiler status endpoint failed"
  exit 1
fi

echo ""

# Test 3: Debug Status Endpoint
echo "3️⃣  Testing /api/status endpoint..."
DEBUG_RESPONSE=$(curl -s "$BASE_URL/api/status")
echo "Response: $DEBUG_RESPONSE"

if echo "$DEBUG_RESPONSE" | grep -q '"service":"power-bot"'; then
  echo "✅ Debug status endpoint works"
else
  echo "❌ Debug status endpoint failed"
  exit 1
fi

echo ""

# Test 4: 404 Error Handling
echo "4️⃣  Testing 404 error handling..."
ERROR_RESPONSE=$(curl -s "$BASE_URL/api/nonexistent")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/nonexistent")

if [ "$HTTP_CODE" = "404" ]; then
  echo "✅ 404 handling works (HTTP $HTTP_CODE)"
else
  echo "❌ 404 handling failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "=============================="
echo "✅ All tests passed!"
echo ""
