#\!/bin/bash

echo "=== Testing both new date formats ==="

# Test format 1: "26 may- 10 june, 2026"
CONV_ID="test-format1-$(date +%s)"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I want to go to Canada\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null > /dev/null

curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null > /dev/null

echo "Testing: '26 may- 10 june, 2026'"
RESULT1=$(curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"26 may- 10 june, 2026\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response')

if [[ "$RESULT1" == *"What are your dates?"* ]]; then
  echo "❌ Format 1 FAILED"
else
  echo "✅ Format 1 WORKS"
fi

echo ""

# Test format 2: "26 of may until 10th of june , 2026"
CONV_ID="test-format2-$(date +%s)"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I want to go to Canada\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null > /dev/null

curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null > /dev/null

echo "Testing: '26 of may until 10th of june , 2026'"
RESULT2=$(curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"26 of may until 10th of june , 2026\", \"conversationId\": \"$CONV_ID\"}" \
  2>/dev/null | jq -r '.response')

if [[ "$RESULT2" == *"What are your dates?"* ]]; then
  echo "❌ Format 2 FAILED"
  echo "Response: $RESULT2"
else
  echo "✅ Format 2 WORKS"
fi

echo ""
