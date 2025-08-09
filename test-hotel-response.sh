#!/bin/bash

# Test if hotel response text uses real data
echo "🏨 Testing Hotel Response Text vs Real Data"
echo "==========================================="

CONVERSATION_ID="hotel-test-$(date +%s)"
API_URL="http://localhost:3000/api/intelligent-conversation"

echo "🆔 Test ID: $CONVERSATION_ID"
echo ""

# Quick setup
echo "Setting up trip context..."
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"Japan\"}" > /dev/null
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"7 days\"}" > /dev/null  
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"£2000\"}" > /dev/null
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"2\"}" > /dev/null
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"London\"}" > /dev/null
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"hotel\"}" > /dev/null
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"mid-range\"}" > /dev/null
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"food and culture\"}" > /dev/null

echo "Triggering itinerary generation..."

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"yes\"}")

echo ""
echo "📊 RESPONSE TEXT:"
echo "=================="
BOT_RESPONSE=$(echo "$RESPONSE" | jq -r '.response')
echo "$BOT_RESPONSE" | head -c 300
echo ""

echo ""
echo "🏨 HOTEL COMPARISON:"
echo "===================="

# Extract hotel from response text
RESPONSE_HOTEL=$(echo "$BOT_RESPONSE" | grep -o 'Hotel:[^🏨]*' | head -1)
echo "Response Text Hotel: $RESPONSE_HOTEL"

# Extract hotel from itinerary data
ITINERARY_HOTEL=$(echo "$RESPONSE" | jq -r '.itinerary.hotel.name // "not found"')
echo "Itinerary Data Hotel: $ITINERARY_HOTEL"

if [[ "$RESPONSE_HOTEL" == *"$ITINERARY_HOTEL"* ]]; then
    echo "✅ SUCCESS: Response text matches itinerary data!"
else
    echo "❌ MISMATCH: Response text doesn't match itinerary data"
fi

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null

echo ""
echo "🎯 Hotel Response Test Complete"