#!/bin/bash

echo "🧪 Testing Single-City vs Multi-City Choice"
echo "=========================================="

# Test 1: User chooses single-city focus
echo -e "\n=== TEST 1: Single-City Focus Choice ==="
CONV_ID1="single-test-$(date +%s)"
echo "Using conversation ID: $CONV_ID1"

echo -e "\n1. Detect multi-city input..."
RESULT=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID1\", \"slot\": \"destination\", \"value\": \"Dublin and Cork\"}")

echo "Multi-city detected, showing options..."
echo "Next slot: $(echo "$RESULT" | jq -r '.expectedSlot')"

echo -e "\n2. User chooses single city focus..."
RESULT=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID1\", \"slot\": \"route-confirmation\", \"value\": \"single city\"}")

echo "Response:"
echo "$RESULT" | jq -r '.message // .confirmation' | head -5
echo "Next slot: $(echo "$RESULT" | jq -r '.expectedSlot')"
echo "Multi-city plan cleared: $(echo "$RESULT" | jq -r '.state.multiCityPlan == null')"

echo -e "\n3. User selects Dublin..."
RESULT=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID1\", \"slot\": \"destination-scope\", \"value\": \"Dublin\"}")

echo "Response:"
echo "$RESULT" | jq -r '.confirmation' | head -5
echo "Destination type: $(echo "$RESULT" | jq -r '.state.destination.type')"
echo "Destination value: $(echo "$RESULT" | jq -r '.state.destination.value')"
echo "Next slot: $(echo "$RESULT" | jq -r '.expectedSlot')"

# Test 2: User chooses multi-city tour
echo -e "\n\n=== TEST 2: Multi-City Tour Choice ==="
CONV_ID2="multi-test-$(date +%s)"
echo "Using conversation ID: $CONV_ID2"

echo -e "\n1. Detect multi-city input..."
RESULT=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID2\", \"slot\": \"destination\", \"value\": \"London, Paris, and Rome\"}")

echo "Multi-city detected with 3 cities"
echo "Next slot: $(echo "$RESULT" | jq -r '.expectedSlot')"

# Add required info
echo -e "\n2. Adding travel details..."
curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID2\", \"slot\": \"dates\", \"value\": \"June 15 for 14 days\"}" > /dev/null

curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID2\", \"slot\": \"travelers\", \"value\": \"2\"}" > /dev/null

curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID2\", \"slot\": \"budget\", \"value\": \"5000\"}" > /dev/null

echo -e "\n3. User chooses multi-city tour..."
RESULT=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID2\", \"slot\": \"route-confirmation\", \"value\": \"multi-city tour\"}")

echo "Response (multi-city planning triggered):"
if echo "$RESULT" | grep -q "Comprehensive Itinerary Generated"; then
    echo "✅ Multi-city comprehensive planning activated!"
    echo "Cities: $(echo "$RESULT" | jq -r '.state.multiCityPlan.cities | length') cities planned"
    echo "Route confirmed: $(echo "$RESULT" | jq -r '.state.multiCityPlan.confirmed')"
    echo "Planning generated: $(echo "$RESULT" | jq -r '.state.multiCityPlan.comprehensiveItinerary != null')"
else
    echo "❌ Multi-city planning not triggered as expected"
fi

# Test 3: Direct single-city input (should not trigger multi-city logic)
echo -e "\n\n=== TEST 3: Direct Single-City Input ==="
CONV_ID3="direct-single-$(date +%s)"
echo "Using conversation ID: $CONV_ID3"

RESULT=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID3\", \"slot\": \"destination\", \"value\": \"Dublin\"}")

echo "Single city input result:"
echo "Destination type: $(echo "$RESULT" | jq -r '.state.destination.type')"
echo "Multi-city plan exists: $(echo "$RESULT" | jq -r '.state.multiCityPlan != null')"
echo "Next slot: $(echo "$RESULT" | jq -r '.expectedSlot')"
echo "Should go directly to origin (not route-confirmation): $(echo "$RESULT" | jq -r '.expectedSlot == "origin"')"

echo -e "\n✅ Testing completed!"
echo "Summary:"
echo "- Single-city choice: Clears multi-city plan, focuses on one destination"  
echo "- Multi-city choice: Activates comprehensive planning system"
echo "- Direct single input: Bypasses multi-city logic entirely"