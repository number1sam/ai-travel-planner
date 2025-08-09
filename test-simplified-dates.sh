#\!/bin/bash

echo "=== Testing simple date input ==="

CONV_ID="simple-dates-$(date +%s)"

echo "1. Start and ask for dates directly"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I want to go to Paris\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "2. Confirm Paris"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "3. Try different date formats to see which ones work:"
echo "Format: June 15-25, 2025"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"June 15-25, 2025\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
