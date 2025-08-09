#!/bin/bash

# Debug specific recovery scenario that failed in state recovery test
echo "🔍 DEBUGGING SPECIFIC RECOVERY SCENARIO"
echo "======================================="

CONVERSATION_ID="specific-recovery-$(date +%s)"
API_URL="http://localhost:3000/api/intelligent-conversation"

echo "🆔 Test ID: $CONVERSATION_ID"
echo ""

# Replicate EXACT same scenario as the failing test
echo "📝 Phase 1: Building conversation state (exact replica)..."

declare -a SETUP_MESSAGES=(
    "I want to visit Japan"
    "14 days"
    "£4000"
    "2 people"
    "London Heathrow"
    "traditional ryokan and modern hotels"
    "luxury"
    "traditional culture, temples, and authentic food"
)

for i in "${!SETUP_MESSAGES[@]}"; do
    MESSAGE="${SETUP_MESSAGES[$i]}"
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
echo "🔍 Phase 2: Detailed context analysis after setup..."

SETUP_STATE=$(curl -s -X GET "$API_URL?conversationId=$CONVERSATION_ID")
SETUP_CONTEXT=$(echo "$SETUP_STATE" | jq -r '.tripContext')

echo "Context after setup:"
echo "  Destination: $(echo "$SETUP_CONTEXT" | jq -r '.destination.primary // "missing"')"
echo "  Duration: $(echo "$SETUP_CONTEXT" | jq -r '.dates.duration // "missing"')"  
echo "  Budget: $(echo "$SETUP_CONTEXT" | jq -r '.budget.total // "missing"') $(echo "$SETUP_CONTEXT" | jq -r '.budget.currency // "missing"')"
echo "  Travelers: $(echo "$SETUP_CONTEXT" | jq -r '.travelers.adults // "missing"')"
echo "  Origin: $(echo "$SETUP_CONTEXT" | jq -r '.origin // "missing"')"
echo "  Accommodation: $(echo "$SETUP_CONTEXT" | jq -r '.preferences.accommodation // "missing"')"
echo "  Style: $(echo "$SETUP_CONTEXT" | jq -r '.preferences.style // "missing"')" 
echo "  Interests: $(echo "$SETUP_CONTEXT" | jq -r '.preferences.interests // "missing"')"
echo "  Current Intent: $(echo "$SETUP_CONTEXT" | jq -r '.currentIntent // "missing"')"
echo "  Messages: $(echo "$SETUP_STATE" | jq -r '.messages | length')"

echo ""
echo "🎯 Phase 3: Testing exact failing message..."

# Use EXACT message from failing test
RECOVERY_MESSAGE="yes, please generate my itinerary"
echo "  Recovery message: \"$RECOVERY_MESSAGE\""

RECOVERY_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"$RECOVERY_MESSAGE\"}")

RECOVERY_BOT=$(echo "$RECOVERY_RESPONSE" | jq -r '.response')
RECOVERY_INTENT=$(echo "$RECOVERY_RESPONSE" | jq -r '.conversationContext.tripContext.currentIntent // "none"')
RECOVERY_ITINERARY=$(echo "$RECOVERY_RESPONSE" | jq -r '.metadata.itineraryGenerated // false')

echo "    Bot: $(echo "$RECOVERY_BOT" | head -c 120)..."
echo "    Intent: $RECOVERY_INTENT"
echo "    Itinerary Generated: $RECOVERY_ITINERARY"

echo ""
echo "🔍 Phase 4: Analysis of what went wrong..."

# Check if the message was interpreted as a "yes" response
if [[ "$RECOVERY_MESSAGE" =~ ^.*yes.* ]]; then
    echo "  ✅ Message contains 'yes'"
else
    echo "  ❌ Message does NOT contain 'yes'"
fi

# Check current intent
if [[ "$RECOVERY_INTENT" == "itinerary_completed" ]]; then
    echo "  ✅ Intent is 'itinerary_completed' (success)"
elif [[ "$RECOVERY_INTENT" == "generating_itinerary" ]]; then
    echo "  ⚠️ Intent is 'generating_itinerary' (in progress)"
elif [[ "$RECOVERY_INTENT" == "generate_itinerary" ]]; then
    echo "  ⚠️ Intent is 'generate_itinerary' (ready to generate)"
else
    echo "  ❌ Intent is '$RECOVERY_INTENT' (unexpected)"
fi

# Check if itinerary was generated
if [[ "$RECOVERY_ITINERARY" == "true" ]]; then
    echo "  ✅ Itinerary WAS generated"
else
    echo "  ❌ Itinerary was NOT generated"
fi

# Check response type
if [[ "$RECOVERY_BOT" =~ "itinerary is ready" ]]; then
    echo "  ✅ Bot shows itinerary completion"
elif [[ "$RECOVERY_BOT" =~ "generating" ]]; then
    echo "  ⚠️ Bot shows generation message"
elif [[ "$RECOVERY_BOT" =~ "Perfect! I have all" ]]; then
    echo "  ❌ Bot shows summary instead of generating"
else
    echo "  ❓ Bot response unclear"
fi

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null

echo ""
echo "🏁 Specific recovery debugging complete!"