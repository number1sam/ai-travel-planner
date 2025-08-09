#!/bin/bash

# Quick verification test for itinerary generation fix
echo "🔧 Testing Itinerary Generation Fix"
echo "=================================="

CONVERSATION_ID="fix-test-$(date +%s)"
API_URL="http://localhost:3000/api/intelligent-conversation"

echo "🆔 Test ID: $CONVERSATION_ID"
echo ""

# Quick conversation to test the fix
declare -a MESSAGES=(
    "I want to go to France"
    "7 days" 
    "£2000"
    "2"
    "London"
    "hotel"
    "mid-range"
    "food and culture"
    "yes"
    "thanks, looks great!"
)

for i in "${!MESSAGES[@]}"; do
    MESSAGE="${MESSAGES[$i]}"
    STEP=$((i + 1))
    
    echo "Step $STEP: \"$MESSAGE\""
    
    RESPONSE=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"$MESSAGE\"}")
    
    BOT_RESPONSE=$(echo "$RESPONSE" | jq -r '.response')
    CURRENT_INTENT=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.currentIntent // empty')
    ITINERARY_GENERATED=$(echo "$RESPONSE" | jq -r '.metadata.itineraryGenerated // false')
    
    echo "Bot: $(echo "$BOT_RESPONSE" | head -c 100)..."
    echo "Intent: $CURRENT_INTENT | Generated: $ITINERARY_GENERATED"
    echo ""
    
    # Check steps 9 and 10 specifically
    if [[ $STEP == 9 ]]; then
        if [[ "$BOT_RESPONSE" =~ "itinerary is ready" ]]; then
            echo "✅ SUCCESS: Itinerary generation works immediately!"
        else
            echo "❌ FAILURE: Still showing generating message"
        fi
    fi
    
    if [[ $STEP == 10 ]]; then
        if [[ "$BOT_RESPONSE" =~ "itinerary is ready" || "$BOT_RESPONSE" =~ "complete" ]]; then
            echo "✅ SUCCESS: No conversation reset - shows completion!"
        else
            echo "❌ FAILURE: Conversation still resets"
        fi
    fi
    
    sleep 0.2
done

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null

echo ""
echo "🎯 Fix Status: TESTING COMPLETE"