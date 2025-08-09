#!/bin/bash

# Debug location redundancy detection
echo "🔍 Debugging Location Redundancy"
echo "==============================="

CONVERSATION_ID="debug-location-$(date +%s)"
API_URL="http://localhost:3000/api/intelligent-conversation"

echo "Testing location redundancy sequence:"
echo ""

# Set up context
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"Japan for 14 days with £3000 budget for 2 people\"}" > /dev/null
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"Heathrow\"}" > /dev/null

echo "📝 Context: Origin set to 'London (Heathrow)'"
echo "📝 Now sending redundant: 'London'"

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"London\"}")

echo "🤖 Response: $(echo "$RESPONSE" | jq -r '.response' | head -c 150)..."
ORIGIN_IN_CONTEXT=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.origin')
echo "📊 Origin in context: '$ORIGIN_IN_CONTEXT'"

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null