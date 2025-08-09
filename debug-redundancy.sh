#!/bin/bash

# Debug script for redundancy detection
echo "🔍 Debugging Redundancy Detection"
echo "==============================="

CONVERSATION_ID="debug-redundancy-$(date +%s)"
API_URL="http://localhost:3000/api/intelligent-conversation"

echo "Testing specific redundant sequence:"
echo ""

# Set up context first
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"I want to go to Japan\"}" > /dev/null
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"two weeks\"}" > /dev/null

echo "📝 Context established: Japan, 14 days"
echo "📝 Now sending redundant: '14 days'"

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"14 days\"}")

echo "🤖 Response: $(echo "$RESPONSE" | jq -r '.response')"

DURATION_IN_CONTEXT=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.dates.duration')
echo "📊 Duration in context: $DURATION_IN_CONTEXT"

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null