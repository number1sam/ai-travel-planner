#!/bin/bash

# Debug currency clarification logic
echo "🔍 DEBUGGING CURRENCY CLARIFICATION"
echo "==================================="

CONVERSATION_ID="debug-currency-$(date +%s)"
API_URL="http://localhost:3001/api/intelligent-conversation"

echo "🆔 Test ID: $CONVERSATION_ID"
echo ""

# Phase 1: Setup trip context
echo "📝 Phase 1: Setting up trip context..."

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"Italy\"}" > /dev/null

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"7 days\"}" > /dev/null

echo "  ✅ Context: Italy, 7 days"
echo ""

# Phase 2: Send number without currency
echo "💰 Phase 2: Testing number without currency..."
echo "  Input: '2500'"

BUDGET_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"2500\"}")

BUDGET_BOT=$(echo "$BUDGET_RESPONSE" | jq -r '.response')
BUDGET_CURRENCY=$(echo "$BUDGET_RESPONSE" | jq -r '.conversationContext.tripContext.budget.currency // "missing"')
BUDGET_TOTAL=$(echo "$BUDGET_RESPONSE" | jq -r '.conversationContext.tripContext.budget.total // "missing"')
BUDGET_PENDING=$(echo "$BUDGET_RESPONSE" | jq -r '.conversationContext.tripContext.budget.pendingClarification // false')

echo "    Bot response: $(echo "$BUDGET_BOT" | head -c 100)..."
echo "    Currency: $BUDGET_CURRENCY"
echo "    Total: $BUDGET_TOTAL"
echo "    Pending clarification: $BUDGET_PENDING"

if [[ "$BUDGET_CURRENCY" == "PENDING" ]]; then
    echo "  ✅ Correctly marked budget as PENDING"
else
    echo "  ❌ Budget currency should be PENDING but got: $BUDGET_CURRENCY"
fi
echo ""

# Phase 3: Send currency clarification
echo "🔄 Phase 3: Testing currency clarification..."
echo "  Input: 'pounds'"

CURRENCY_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"pounds\"}")

CURRENCY_BOT=$(echo "$CURRENCY_RESPONSE" | jq -r '.response')
CURRENCY_FINAL=$(echo "$CURRENCY_RESPONSE" | jq -r '.conversationContext.tripContext.budget.currency // "missing"')
CURRENCY_TOTAL=$(echo "$CURRENCY_RESPONSE" | jq -r '.conversationContext.tripContext.budget.total // "missing"')
CURRENCY_PENDING=$(echo "$CURRENCY_RESPONSE" | jq -r '.conversationContext.tripContext.budget.pendingClarification // false')

echo "    Bot response: $(echo "$CURRENCY_BOT" | head -c 100)..."
echo "    Currency: $CURRENCY_FINAL"
echo "    Total: $CURRENCY_TOTAL"
echo "    Pending clarification: $CURRENCY_PENDING"

if [[ "$CURRENCY_FINAL" == "GBP" ]]; then
    echo "  ✅ Correctly updated currency to GBP"
else
    echo "  ❌ Currency should be GBP but got: $CURRENCY_FINAL"
fi

if [[ "$CURRENCY_PENDING" == "false" ]]; then
    echo "  ✅ Correctly cleared pending clarification"
else
    echo "  ❌ Pending clarification should be false but got: $CURRENCY_PENDING"
fi
echo ""

# Phase 4: Test different currency formats
echo "🔄 Phase 4: Testing different currency formats..."

# Test £ symbol
SYMBOL_ID="debug-symbol-$(date +%s)"
echo "  Testing '£' symbol..."

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$SYMBOL_ID\", \"message\": \"Italy\"}" > /dev/null

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$SYMBOL_ID\", \"message\": \"7 days\"}" > /dev/null

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$SYMBOL_ID\", \"message\": \"2500\"}" > /dev/null

SYMBOL_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$SYMBOL_ID\", \"message\": \"£\"}")

SYMBOL_CURRENCY=$(echo "$SYMBOL_RESPONSE" | jq -r '.conversationContext.tripContext.budget.currency // "missing"')
echo "    Result for '£': $SYMBOL_CURRENCY"

# Test "GBP"
GBP_ID="debug-gbp-$(date +%s)"
echo "  Testing 'GBP' text..."

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$GBP_ID\", \"message\": \"Italy\"}" > /dev/null

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$GBP_ID\", \"message\": \"7 days\"}" > /dev/null

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$GBP_ID\", \"message\": \"2500\"}" > /dev/null

GBP_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$GBP_ID\", \"message\": \"GBP\"}")

GBP_CURRENCY=$(echo "$GBP_RESPONSE" | jq -r '.conversationContext.tripContext.budget.currency // "missing"')
echo "    Result for 'GBP': $GBP_CURRENCY"

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null
curl -s -X DELETE "$API_URL?conversationId=$SYMBOL_ID" > /dev/null
curl -s -X DELETE "$API_URL?conversationId=$GBP_ID" > /dev/null

echo ""
echo "🏁 Currency clarification debugging complete!"