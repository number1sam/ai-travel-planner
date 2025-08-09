#\!/bin/bash

echo "=== Testing complete flow with 26 may- 10 june 2026 ==="

CONV_ID="debug-complete-$(date +%s)"

echo "1. Start"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I want to go to Canada\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "2. Confirm Canada"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "3. Give the problematic date format"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"26 may- 10 june 2026\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "4. Confirm the dates"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "5. What happens when we try to continue?"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"London\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
