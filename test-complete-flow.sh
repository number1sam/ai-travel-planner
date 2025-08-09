#\!/bin/bash

echo "=== Testing complete conversation flow ==="

CONV_ID="complete-flow-$(date +%s)"

curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I want to go to Canada on 3rd-18 of May 2026\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""  
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"London\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"2 adults\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
