#!/bin/bash

echo "🧪 Step-by-Step Multi-City Flow Test"
echo "=================================="

CONV_ID="step-test-$(date +%s)"
echo "Using conversation ID: $CONV_ID"

echo -e "\n=== STEP 1: Multi-city detection ==="
RESULT=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"slot\": \"destination\", \"value\": \"Dublin and Cork\"}")

echo "Response:"
echo "$RESULT" | jq -r '.message // .confirmation // "no message"'
echo "Next slot: $(echo "$RESULT" | jq -r '.expectedSlot // .nextSlot // "none"')"
echo "Multi-city plan exists: $(echo "$RESULT" | jq -r '.state.multiCityPlan != null')"

echo -e "\n=== STEP 2: Add dates ==="
RESULT=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"slot\": \"dates\", \"value\": \"June 15 for 7 days\"}")

echo "Response:"
echo "$RESULT" | jq -r '.confirmation // .message // "no confirmation"'
echo "Next slot: $(echo "$RESULT" | jq -r '.expectedSlot // .nextSlot // "none"')"
echo "Dates filled: $(echo "$RESULT" | jq -r '.state.dates.filled')"

echo -e "\n=== STEP 3: Add travelers ==="
RESULT=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"slot\": \"travelers\", \"value\": \"2\"}")

echo "Response:"
echo "$RESULT" | jq -r '.confirmation // .message // "no confirmation"'
echo "Next slot: $(echo "$RESULT" | jq -r '.expectedSlot // .nextSlot // "none"')"
echo "Travelers filled: $(echo "$RESULT" | jq -r '.state.travelers.filled')"

echo -e "\n=== STEP 4: Add budget ==="
RESULT=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"slot\": \"budget\", \"value\": \"2500\"}")

echo "Response:"
echo "$RESULT" | jq -r '.confirmation // .message // "no confirmation"' | head -10
echo "Next slot: $(echo "$RESULT" | jq -r '.expectedSlot // .nextSlot // "none"')"
echo "Budget filled: $(echo "$RESULT" | jq -r '.state.budget.filled')"
echo "Multi-city confirmed: $(echo "$RESULT" | jq -r '.state.multiCityPlan.confirmed')"

# Check if we should go to route-confirmation
if [ "$(echo "$RESULT" | jq -r '.expectedSlot // .nextSlot')" = "route-confirmation" ]; then
    echo -e "\n=== STEP 5: Route confirmation & comprehensive generation ==="
    RESULT=$(curl -s -X POST http://localhost:3000/api/conversation-state \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$CONV_ID\", \"slot\": \"route-confirmation\", \"value\": \"yes, create this plan\"}")
    
    echo "Response:"
    echo "$RESULT" | jq -r '.confirmation // .message // "no confirmation"' | head -15
    echo "Success: $(echo "$RESULT" | jq -r '.success')"
    
    # Check for comprehensive itinerary
    if echo "$RESULT" | jq -e '.state.multiCityPlan.comprehensiveItinerary' > /dev/null 2>&1; then
        echo -e "\n🎯 COMPREHENSIVE ITINERARY GENERATED!"
        echo "Title: $(echo "$RESULT" | jq -r '.state.multiCityPlan.comprehensiveItinerary.overview.title')"
        echo "Confidence: $(echo "$RESULT" | jq -r '.state.multiCityPlan.comprehensiveItinerary.metadata.confidence')%"
    else
        echo -e "\n❌ No comprehensive itinerary in response"
    fi
else
    echo -e "\n❌ Expected route-confirmation but got: $(echo "$RESULT" | jq -r '.expectedSlot // .nextSlot')"
fi

echo -e "\nTest completed."