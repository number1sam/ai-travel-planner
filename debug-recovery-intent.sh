#!/bin/bash

# Debug recovery intent detection
echo "🔍 DEBUGGING RECOVERY INTENT DETECTION"
echo "====================================="

CONVERSATION_ID="debug-recovery-$(date +%s)"
API_URL="http://localhost:3000/api/intelligent-conversation"

echo "🆔 Test ID: $CONVERSATION_ID"
echo ""

# Build up complete conversation state
echo "📝 Phase 1: Building complete conversation state..."

declare -a MESSAGES=(
    "Japan"
    "14 days"
    "£4000"
    "2"
    "London"
    "hotel"
    "luxury"
    "food and culture"
)

for i in "${!MESSAGES[@]}"; do
    MESSAGE="${MESSAGES[$i]}"
    STEP=$((i + 1))
    
    echo "  Step $STEP: \"$MESSAGE\""
    
    RESPONSE=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"$MESSAGE\"}")
    
    BOT_RESPONSE=$(echo "$RESPONSE" | jq -r '.response')
    CURRENT_INTENT=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.currentIntent // "none"')
    
    echo "    Bot: $(echo "$BOT_RESPONSE" | head -c 80)..."
    echo "    Intent: $CURRENT_INTENT"
    
    sleep 0.1
done

echo ""
echo "🔍 Phase 2: Checking readiness for itinerary generation..."

# Get full context to debug
FINAL_STATE=$(curl -s -X GET "$API_URL?conversationId=$CONVERSATION_ID")
TRIP_CONTEXT=$(echo "$FINAL_STATE" | jq -r '.tripContext')

echo "Current context:"
echo "  Destination: $(echo "$TRIP_CONTEXT" | jq -r '.destination.primary // "missing"')"
echo "  Duration: $(echo "$TRIP_CONTEXT" | jq -r '.dates.duration // "missing"')"
echo "  Budget: $(echo "$TRIP_CONTEXT" | jq -r '.budget.total // "missing"') $(echo "$TRIP_CONTEXT" | jq -r '.budget.currency // "missing"')"
echo "  Travelers: $(echo "$TRIP_CONTEXT" | jq -r '.travelers.adults // "missing"')"
echo "  Origin: $(echo "$TRIP_CONTEXT" | jq -r '.origin // "missing"')"
echo "  Accommodation: $(echo "$TRIP_CONTEXT" | jq -r '.preferences.accommodation // "missing"')"
echo "  Style: $(echo "$TRIP_CONTEXT" | jq -r '.preferences.style // "missing"')"
echo "  Interests: $(echo "$TRIP_CONTEXT" | jq -r '.preferences.interests // "missing"')"
echo "  Current Intent: $(echo "$TRIP_CONTEXT" | jq -r '.currentIntent // "missing"')"

echo ""
echo "🎯 Phase 3: Testing 'yes' response..."

YES_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"yes\"}")

YES_BOT_RESPONSE=$(echo "$YES_RESPONSE" | jq -r '.response')
YES_INTENT=$(echo "$YES_RESPONSE" | jq -r '.conversationContext.tripContext.currentIntent // "none"')
YES_ITINERARY=$(echo "$YES_RESPONSE" | jq -r '.metadata.itineraryGenerated // false')

echo "  Yes Response: \"yes\""
echo "  Bot: $(echo "$YES_BOT_RESPONSE" | head -c 100)..."
echo "  Intent: $YES_INTENT"
echo "  Itinerary Generated: $YES_ITINERARY"

echo ""
echo "🔍 Analysis:"

if [[ "$YES_INTENT" == "generating_itinerary" ]]; then
    echo "  ✅ Intent correctly set to 'generating_itinerary'"
else
    echo "  ❌ Intent NOT set to 'generating_itinerary' (got: $YES_INTENT)"
fi

if [[ "$YES_ITINERARY" == "true" ]]; then
    echo "  ✅ Itinerary generation triggered"
else
    echo "  ❌ Itinerary generation NOT triggered"
fi

if [[ "$YES_BOT_RESPONSE" =~ "generating" || "$YES_BOT_RESPONSE" =~ "ready" ]]; then
    echo "  ✅ Bot showing generation or completion message"  
else
    echo "  ❌ Bot NOT showing generation message"
fi

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null

echo ""
echo "🏁 Recovery intent debugging complete!"