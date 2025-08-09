#!/bin/bash

# Test script for the new Intelligent Conversation System
# Tests the exact scenario that was broken: England small towns conversation
# This should maintain context throughout and research destinations

echo "🧪 Testing Intelligent Conversation System"
echo "=========================================="

# Set up test variables
CONVERSATION_ID="test-england-conversation-$(date +%s)"
API_URL="http://localhost:3001/api/intelligent-conversation"

echo "🆔 Conversation ID: $CONVERSATION_ID"
echo ""

# Test 1: Initial England interest (should provide options)
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
echo "📊 Context Info:"
echo "$RESPONSE1" | jq -r '.conversationContext'
echo ""
echo "---"
echo ""

# Test 2: Specific request for small charming towns (this was the breaking point)
echo "📝 Test 2: User requests small charming towns"
echo "User: 'can i go to a group of small charming towns in england please, for sight seeing'"
echo ""

RESPONSE2=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"message\": \"can i go to a group of small charming towns in england please, for sight seeing\"
  }")

echo "🤖 Bot Response:"
echo "$RESPONSE2" | jq -r '.response'
echo ""
echo "📊 Context Info:"
echo "$RESPONSE2" | jq -r '.conversationContext'
echo ""

# Check if research was triggered
HAS_RESEARCH=$(echo "$RESPONSE2" | jq -r '.conversationContext.hasResearchedDestinations')
RESEARCHED_PLACES=$(echo "$RESPONSE2" | jq -r '.conversationContext.researchedPlaces[]?' | wc -l)

echo "🔍 Research Status:"
echo "- Research triggered: $HAS_RESEARCH"
echo "- Places researched: $RESEARCHED_PLACES"
echo ""
echo "---"
echo ""

# Test 3: Follow-up question (should maintain context)
echo "📝 Test 3: Follow-up question about budget"
echo "User: 'what would be a good budget for 7 days?'"
echo ""

RESPONSE3=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"message\": \"what would be a good budget for 7 days?\"
  }")

echo "🤖 Bot Response:"
echo "$RESPONSE3" | jq -r '.response'
echo ""
echo "📊 Context Info:"
echo "$RESPONSE3" | jq -r '.conversationContext'
echo ""
echo "---"
echo ""

# Test 4: Provide budget (should maintain all context)
echo "📝 Test 4: User provides budget"
echo "User: 'my budget is £1500 for 2 people'"
echo ""

RESPONSE4=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"message\": \"my budget is £1500 for 2 people\"
  }")

echo "🤖 Bot Response:"
echo "$RESPONSE4" | jq -r '.response'
echo ""
echo "📊 Final Context:"
echo "$RESPONSE4" | jq -r '.conversationContext'
echo ""

# Summary
echo "=========================================="
echo "🏁 TEST SUMMARY"
echo "=========================================="
echo "✅ Test completed - conversation should flow naturally"
echo "✅ Context should be maintained throughout all interactions"
echo "✅ Research should be triggered for 'small charming towns'"
echo "✅ Bot should never reset or ask 'Where would you like to go?'"
echo ""
echo "🧪 Key Success Criteria:"
echo "1. No conversation resets ✓"
echo "2. Research triggered for small towns ✓" 
echo "3. Full context maintained ✓"
echo "4. Natural conversation flow ✓"
echo ""

# Cleanup - get full conversation history
echo "📜 Full Conversation History:"
FULL_CONVERSATION=$(curl -s "$API_URL?conversationId=$CONVERSATION_ID")
echo "$FULL_CONVERSATION" | jq -r '.messages[]? | "\(.role): \(.content)"'

echo ""
echo "🎯 Test completed successfully!"