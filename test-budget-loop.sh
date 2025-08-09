#!/bin/bash

# Test the budget loop bug fix directly

CONVERSATION_ID="budget-loop-test-$(date +%s)"
echo "Testing budget loop fix with conversation ID: $CONVERSATION_ID"

# Test 1: Simulate the exact scenario where user provided "$1000" and system got stuck
echo "=== Test 1: Budget extraction and confirmation ==="

echo "Step 1: User says '$1000' in response to budget question"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"\$1000\"}")

echo "Response: $RESPONSE" | jq -r '.response'
echo "Needs confirmation: $(echo $RESPONSE | jq -r '.needsConfirmation')"
echo "Field to confirm: $(echo $RESPONSE | jq -r '.fieldToConfirm')"

# Check if budget was correctly extracted and needs confirmation (not a loop)
if echo "$RESPONSE" | grep -q '"needsConfirmation":true'; then
  echo "✅ SUCCESS: Budget extraction triggered confirmation (no loop)"
else
  echo "❌ POTENTIAL ISSUE: Budget may not have been extracted properly"
fi

echo ""
echo "Step 2: User confirms budget"
RESPONSE2=$(curl -s -X POST http://localhost:3001/api/rule-based-conversation \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"yes\"}")

echo "Response: $(echo $RESPONSE2 | jq -r '.response')"
echo "Needs confirmation: $(echo $RESPONSE2 | jq -r '.needsConfirmation')"

# Check if system moved on to next question (not repeating budget)
if echo "$RESPONSE2" | grep -q "budget" && echo "$RESPONSE2" | grep -q "I need"; then
  echo "❌ CRITICAL BUG: System is still asking for budget (LOOP DETECTED)"
  exit 1
else
  echo "✅ SUCCESS: System moved on from budget question"
fi

echo ""
echo "=== Budget Loop Test Complete ==="