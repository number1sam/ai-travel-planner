#!/bin/bash

# Debug budget extraction logic
echo "🔍 DEBUGGING BUDGET EXTRACTION"
echo "=============================="

CONVERSATION_ID="debug-budget-$(date +%s)"
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

# Test different budget inputs
test_budget_input() {
    local test_input="$1"
    local description="$2"
    
    echo "💰 Testing: $description"
    echo "  Input: '$test_input'"
    
    # Create fresh conversation for each test
    local test_id="budget-test-$(date +%s)-$RANDOM"
    
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$test_id\", \"message\": \"Italy\"}" > /dev/null
    
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$test_id\", \"message\": \"7 days\"}" > /dev/null
    
    local response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$test_id\", \"message\": \"$test_input\"}")
    
    local budget_currency=$(echo "$response" | jq -r '.conversationContext.tripContext.budget.currency // "missing"')
    local budget_total=$(echo "$response" | jq -r '.conversationContext.tripContext.budget.total // "missing"')
    local bot_response=$(echo "$response" | jq -r '.response')
    
    echo "    Currency: $budget_currency"
    echo "    Total: $budget_total"
    echo "    Bot asks for currency: $(if [[ "$bot_response" =~ "Which currency" ]]; then echo "YES"; else echo "NO"; fi)"
    
    curl -s -X DELETE "$API_URL?conversationId=$test_id" > /dev/null
    echo ""
}

# Test various budget inputs
test_budget_input "2500" "Plain number"
test_budget_input "my budget is 2500" "With budget keyword"
test_budget_input "I can spend 2500" "With spend keyword"
test_budget_input "2500 total" "With total keyword"
test_budget_input "£2500" "With currency symbol"
test_budget_input "around 2500" "With around"
test_budget_input "maximum 2500" "With maximum"

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null

echo "🏁 Budget extraction debugging complete!"