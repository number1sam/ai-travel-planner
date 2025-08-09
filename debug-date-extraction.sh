#\!/bin/bash

echo "=== Testing date extraction step by step ==="

CONV_ID="debug-dates-$(date +%s)"

echo "1. Start conversation"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I want to plan a trip\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "2. When asked for destination, provide Canada"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Canada\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "3. Confirm Canada"  
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "4. When asked for dates, provide 3rd-18 of May 2026"
RESPONSE=$(curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"3rd-18 of May 2026\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null)
echo "$RESPONSE" | jq -r '.response'
echo "Full response:"
echo "$RESPONSE" | jq '.'

echo ""
