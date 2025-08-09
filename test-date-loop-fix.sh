#\!/bin/bash

echo "Testing the date loop fix..."

# Test 1: User provides dates when asked about dates (normal flow)
echo "Test 1: Normal date flow"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d '{"message": "3rd-18 of May 2026", "conversationId": "test-fix-1"}' \
  2>/dev/null | jq -r '.message'

echo ""

# Test 2: Confirm the dates
echo "Test 2: Confirming dates"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d '{"message": "yees", "conversationId": "test-fix-1"}' \
  2>/dev/null | jq -r '.message'

echo ""

# Test 3: When bot asks about travelers, user mentions dates casually - should NOT trigger locked field message
echo "Test 3: Casual date mention while answering travelers question"
curl -X POST http://localhost:3000/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d '{"message": "2 adults for the May trip", "conversationId": "test-fix-1"}' \
  2>/dev/null | jq -r '.message'

echo ""
