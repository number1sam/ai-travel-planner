#\!/bin/bash

echo "=== Testing complete FIXED flow ==="

CONV_ID="complete-fixed-$(date +%s)"

echo "Question 1: Start"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I want to plan a trip\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "Answer 1: Destination"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Tokyo\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "Confirm 1:"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "Answer 2: Dates"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"April 15-25, 2025\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "Confirm 2:"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "Answer 3: Origin"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"New York\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "Confirm 3:"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
echo "Answer 4: Travelers"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"3 people\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response'

echo ""
