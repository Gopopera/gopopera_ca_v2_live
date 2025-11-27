#!/bin/bash

# Test CORS Preflight Response
# This script tests if the OPTIONS preflight request returns POST/PUT methods

set -e

echo "🔍 Testing CORS Preflight Response"
echo "==================================="
echo ""

# Add Google Cloud SDK to PATH
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"

BUCKET="gopopera2026.firebasestorage.app"
ORIGIN="https://www.gopopera.ca"

echo "Testing OPTIONS request to Firebase Storage API..."
echo "Bucket: $BUCKET"
echo "Origin: $ORIGIN"
echo ""

# Make OPTIONS request and extract relevant headers
RESPONSE=$(curl -s -i -X OPTIONS \
  "https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o" \
  -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization,x-goog-resumable" 2>&1)

echo "Response Headers:"
echo "-----------------"
echo "$RESPONSE" | grep -i "access-control" || echo "No access-control headers found"
echo ""

# Check for specific methods
if echo "$RESPONSE" | grep -qi "access-control-allow-methods.*POST"; then
    echo "✅ SUCCESS: POST method is allowed!"
else
    echo "❌ ISSUE: POST method not found in allowed methods"
fi

if echo "$RESPONSE" | grep -qi "access-control-allow-methods.*PUT"; then
    echo "✅ SUCCESS: PUT method is allowed!"
else
    echo "❌ ISSUE: PUT method not found in allowed methods"
fi

if echo "$RESPONSE" | grep -qi "access-control-allow-origin"; then
    echo "✅ SUCCESS: Origin is allowed!"
    echo "$RESPONSE" | grep -i "access-control-allow-origin"
else
    echo "❌ ISSUE: No origin allowed"
fi

echo ""
echo "Full OPTIONS Response:"
echo "---------------------"
echo "$RESPONSE"
echo ""

# Also check the bucket CORS config
echo "Current CORS Configuration on Bucket:"
echo "--------------------------------------"
gsutil cors get gs://${BUCKET} 2>&1 || echo "Could not retrieve CORS config"

