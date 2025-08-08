#!/bin/bash

echo "🧪 Testing Complete Multi-City Planning Flow"
echo "==========================================="

# Generate unique conversation ID
CONV_ID="final-test-$(date +%s)"
echo "Using conversation ID: $CONV_ID"

echo -e "\n1. 🗺️ Detecting multi-city destination..."
RESULT1=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"slot\": \"destination\", \"value\": \"Dublin and Cork\"}")

echo "Multi-city detected:"
echo "$RESULT1" | jq -r '.state.destination.tripScope.scope'
echo "Cities: $(echo "$RESULT1" | jq -r '.state.destination.tripScope.detectedCities | join(", ")')"
echo "Expected slot: $(echo "$RESULT1" | jq -r '.expectedSlot')"

echo -e "\n2. 📅 Adding travel dates..."
curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"slot\": \"dates\", \"value\": \"June 15 for 7 days\"}" > /dev/null

echo -e "\n3. 💰 Adding budget..."
curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"slot\": \"budget\", \"value\": \"2500\"}" > /dev/null

echo -e "\n4. 👥 Adding travelers..."
curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"slot\": \"people\", \"value\": \"2\"}" > /dev/null

echo -e "\n5. ✅ Confirming route & generating comprehensive itinerary..."
RESULT2=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"slot\": \"route-confirmation\", \"value\": \"yes, create this plan\"}")

echo "Route confirmed:"
echo "$RESULT2" | jq -r '.success'

# Check if comprehensive itinerary was generated
if echo "$RESULT2" | jq -e '.state.multiCityPlan.comprehensiveItinerary' > /dev/null 2>&1; then
    echo -e "\n🎯 COMPREHENSIVE ITINERARY GENERATED!"
    echo "====================================="
    
    echo "Title: $(echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.overview.title')"
    echo "Cities: $(echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.overview.cities')"
    echo "Duration: $(echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.overview.duration')"
    echo "Distance: $(echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.overview.totalDistance')km"
    echo "Route Type: $(echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.overview.routeType')"
    echo "Route Efficiency: $(echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.route.efficiency')%"
    echo "Transport Legs: $(echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.transport.legs | length')"
    echo "Accommodations: $(echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.accommodation.cities | length') cities"
    echo "Total Activities: $(echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.activities.totalActivities')"
    echo "Budget: \$$(echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.budget.totalBudget')"
    echo "Planning Confidence: $(echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.metadata.confidence')%"
    
    echo -e "\nHighlights:"
    echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.overview.highlights[]' | head -3 | sed 's/^/• /'
    
    echo -e "\nBooking checklist items:"
    echo "$RESULT2" | jq -r '.state.multiCityPlan.comprehensiveItinerary.bookingChecklist[] | "• [\(.priority | ascii_upcase)] \(.item) - $\(.estimatedCost)"' | head -3
    
    echo -e "\n✅ COMPREHENSIVE MULTI-CITY PLANNING SYSTEM WORKING PERFECTLY!"
else
    echo -e "\n❌ No comprehensive itinerary found in response"
    echo "Checking for errors in confirmation:"
    echo "$RESULT2" | jq -r '.confirmation' | head -10
fi

echo -e "\nTest completed."