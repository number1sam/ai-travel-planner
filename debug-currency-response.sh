#!/bin/bash

# Debug currency response handling
echo "🔍 DEBUGGING CURRENCY RESPONSE HANDLING"
echo "======================================="

CONVERSATION_ID="debug-curr-resp-$(date +%s)"
API_URL="http://localhost:3001/api/intelligent-conversation"

echo "🆔 Test ID: $CONVERSATION_ID"
echo ""

# Phase 1: Setup conversation with PENDING budget
echo "📝 Phase 1: Setting up conversation with PENDING budget..."

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"Italy\"}" > /dev/null

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"7 days\"}" > /dev/null

BUDGET_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"my budget is 2500\"}")

BUDGET_CURRENCY=$(echo "$BUDGET_RESPONSE" | jq -r '.conversationContext.tripContext.budget.currency')
echo "  ✅ Budget set to PENDING: $BUDGET_CURRENCY"
echo ""

# Phase 2: Test different currency responses
test_currency_response() {
    local response_text="$1"
    local expected_currency="$2"
    local description="$3"
    
    echo "💱 Testing: $description"
    echo "  Input: '$response_text'"
    
    local response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"$response_text\"}")
    
    local final_currency=$(echo "$response" | jq -r '.conversationContext.tripContext.budget.currency')
    local bot_response=$(echo "$response" | jq -r '.response')
    local pending_status=$(echo "$response" | jq -r '.conversationContext.tripContext.budget.pendingClarification // "missing"')
    
    echo "    Final currency: $final_currency"
    echo "    Expected: $expected_currency"
    echo "    Pending: $pending_status"
    echo "    Bot continues: $(if [[ ! "$bot_response" =~ "Which currency" ]]; then echo "YES"; else echo "NO (still asking)"; fi)"
    
    if [[ "$final_currency" == "$expected_currency" ]]; then
        echo "  ✅ Currency correctly updated"
    else
        echo "  ❌ Currency not updated correctly"
    fi
    echo ""
}

# Test various currency responses
test_currency_response "pounds" "GBP" "Word: pounds"
test_currency_response "£" "GBP" "Symbol: £"
test_currency_response "GBP" "GBP" "Code: GBP"
test_currency_response "british pounds" "GBP" "Full name: british pounds"
test_currency_response "dollars" "USD" "Word: dollars"
test_currency_response "$" "USD" "Symbol: $"
test_currency_response "euros" "EUR" "Word: euros"
test_currency_response "€" "EUR" "Symbol: €"

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null

echo "🏁 Currency response debugging complete!"