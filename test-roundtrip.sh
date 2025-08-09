#\!/bin/bash

CONV_ID="test-broken-format"

curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I want to go to Canada\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null > /dev/null

curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null > /dev/null

echo "Testing the exact failing format: '26 may- 10 june 2026'"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"26 may- 10 june 2026\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "Testing similar format: '26 may - 10 june 2026' (with spaces)"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"26 may - 10 june 2026\", \"conversationId\": \"${CONV_ID}2\"}" \
  2>/dev/null | jq -r '.response'
