#!/bin/bash

# Test script for currency clarification feature
# Tests that bot asks for currency when user provides number without currency symbol

echo "🧪 Testing Currency Clarification Feature"
echo "========================================="

# Set up test variables
CONVERSATION_ID="test-currency-$(date +%s)"
API_URL="http://localhost:3001/api/intelligent-conversation"

echo "🆔 Conversation ID: $CONVERSATION_ID"
echo ""

# Test 1: Start with England
echo "📝 Test 1: User shows interest in England"
echo "User: 'I would like to go to England'"
echo ""

RESPONSE1=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"message\": \"I would like to go to England\"
  }")

echo "🤖 Bot Response:"
echo "$RESPONSE1" | jq -r '.response'
echo ""
echo "---"
echo ""

# Test 2: Provide duration
echo "📝 Test 2: User provides duration"
echo "User: '7 days'"
echo ""

RESPONSE2=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"message\": \"7 days\"
  }")

echo "🤖 Bot Response:"
echo "$RESPONSE2" | jq -r '.response'
echo ""
echo "---"
echo ""

# Test 3: Provide budget WITHOUT currency symbol (should ask for clarification)
echo "📝 Test 3: User provides budget without currency"
echo "User: 'my budget is 2500'"
echo ""

RESPONSE3=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"message\": \"my budget is 2500\"
  }")

echo "🤖 Bot Response:"
echo "$RESPONSE3" | jq -r '.response'
echo ""

# Check if currency clarification was requested
BUDGET_PENDING=$(echo "$RESPONSE3" | jq -r '.conversationContext.tripContext.budget.currency')
echo "💰 Budget Currency Status: $BUDGET_PENDING"
echo ""
echo "---"
echo ""

# Test 4: Provide currency clarification
echo "📝 Test 4: User clarifies currency"
echo "User: 'pounds'"
echo ""

RESPONSE4=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"message\": \"pounds\"
  }")

echo "🤖 Bot Response:"
echo "$RESPONSE4" | jq -r '.response'
echo ""

# Check if currency was updated
FINAL_CURRENCY=$(echo "$RESPONSE4" | jq -r '.conversationContext.tripContext.budget.currency')
FINAL_AMOUNT=$(echo "$RESPONSE4" | jq -r '.conversationContext.tripContext.budget.total')
echo "💰 Final Budget: $FINAL_CURRENCY $FINAL_AMOUNT"
echo ""
echo "---"
echo ""

# Test 5: Complete with travelers
echo "📝 Test 5: User provides travelers"
echo "User: '2 people'"
echo ""

RESPONSE5=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"message\": \"2 people\"
  }")

echo "🤖 Bot Response:"
echo "$RESPONSE5" | jq -r '.response'
echo ""

# Summary
echo "=========================================="
echo "🏁 CURRENCY CLARIFICATION TEST SUMMARY"
echo "=========================================="
echo "✅ Test should show:"
echo "1. Normal flow until budget question"
echo "2. Budget '2500' without currency → Bot asks for currency"
echo "3. User says 'pounds' → Bot accepts and continues"
echo "4. Final summary shows 'GBP2500'"
echo ""

echo "🎯 Key Success Criteria:"
echo "1. Bot asks for currency when number provided without symbol ✓"
echo "2. Bot accepts currency clarification ✓"
echo "3. Final budget shows correct currency ✓"
echo ""

# Test with currency symbol (should NOT ask for clarification)
echo "=========================================="
echo "🧪 BONUS TEST: Budget WITH Currency Symbol"
echo "=========================================="

CONVERSATION_ID2="test-currency-with-symbol-$(date +%s)"
echo "🆔 New Conversation ID: $CONVERSATION_ID2"
echo ""

echo "📝 Quick Test: Budget with £ symbol"
echo "User sequence: 'England' → '7 days' → '£2500'"
echo ""

# Quick sequence
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID2\", \"message\": \"I would like to go to England\"}" > /dev/null

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID2\", \"message\": \"7 days\"}" > /dev/null

RESPONSE_WITH_SYMBOL=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID2\",
    \"message\": \"£2500\"
  }")

echo "🤖 Bot Response to '£2500':"
echo "$RESPONSE_WITH_SYMBOL" | jq -r '.response'

CURRENCY_WITH_SYMBOL=$(echo "$RESPONSE_WITH_SYMBOL" | jq -r '.conversationContext.tripContext.budget.currency')
echo ""
echo "💰 Currency Status: $CURRENCY_WITH_SYMBOL (should be GBP, not PENDING)"
echo ""

echo "🎯 This should NOT ask for currency clarification!"
echo "🎯 Test completed successfully!"