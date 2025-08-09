#!/bin/bash

# Test real destination data vs placeholder data
echo "🎯 Testing Real Destination Data Implementation"
echo "=============================================="

CONVERSATION_ID="real-data-$(date +%s)"
API_URL="http://localhost:3000/api/intelligent-conversation"

echo "🆔 Test ID: $CONVERSATION_ID"
echo ""

echo "📝 TESTING JAPAN (should have real data)"
echo "========================================"

# Setup Japan trip conversation
declare -a MESSAGES=(
    "I want to go to Japan"
    "7 days" 
    "£2500"
    "2"
    "London Heathrow"
    "hotel"
    "mid-range"
    "food and culture and history"
    "yes"  # Generate itinerary
)

for i in "${!MESSAGES[@]}"; do
    MESSAGE="${MESSAGES[$i]}"
    STEP=$((i + 1))
    
    echo "Step $STEP: \"$MESSAGE\""
    
    RESPONSE=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"$MESSAGE\"}")
    
    BOT_RESPONSE=$(echo "$RESPONSE" | jq -r '.response')
    ITINERARY_GENERATED=$(echo "$RESPONSE" | jq -r '.metadata.itineraryGenerated // false')
    
    echo "Bot: $(echo "$BOT_RESPONSE" | head -c 100)..."
    echo "Itinerary Generated: $ITINERARY_GENERATED"
    
    # Check for real data indicators on itinerary generation
    if [[ $STEP == 9 && "$ITINERARY_GENERATED" == "true" ]]; then
        echo ""
        echo "🔍 ANALYZING ITINERARY FOR REAL DATA:"
        echo "===================================="
        
        # Extract itinerary data for analysis
        ITINERARY_DATA=$(echo "$RESPONSE" | jq -r '.itinerary')
        
        if [[ "$ITINERARY_DATA" != "null" ]]; then
            # Check hotel details
            HOTEL_NAME=$(echo "$ITINERARY_DATA" | jq -r '.hotel.name // "not found"')
            HOTEL_DESCRIPTION=$(echo "$ITINERARY_DATA" | jq -r '.hotel.description // "not found"')
            
            echo "🏨 Hotel: $HOTEL_NAME"
            echo "📝 Description: $(echo "$HOTEL_DESCRIPTION" | head -c 80)..."
            
            if [[ "$HOTEL_NAME" != *"Central Hotel"* ]]; then
                echo "✅ SUCCESS: Real hotel data detected!"
            else
                echo "❌ FAILURE: Still using generic hotel name"
            fi
            
            # Check activities for specificity
            FIRST_ACTIVITY_NAME=$(echo "$ITINERARY_DATA" | jq -r '.days[1].activities[1].name // "not found"')
            FIRST_ACTIVITY_DESC=$(echo "$ITINERARY_DATA" | jq -r '.days[1].activities[1].description // "not found"')
            
            echo ""
            echo "🎯 Sample Activity: $FIRST_ACTIVITY_NAME"
            echo "📝 Description: $(echo "$FIRST_ACTIVITY_DESC" | head -c 100)..."
            
            if [[ "$FIRST_ACTIVITY_NAME" == *"Senso-ji"* || "$FIRST_ACTIVITY_NAME" == *"Meiji"* || "$FIRST_ACTIVITY_NAME" == *"Tsukiji"* ]]; then
                echo "✅ SUCCESS: Real attraction names detected!"
            else
                echo "⚠️  WARNING: Generic activity names still in use"
            fi
            
            # Check for specific Japanese locations
            if [[ "$FIRST_ACTIVITY_DESC" == *"Asakusa"* || "$FIRST_ACTIVITY_DESC" == *"Shibuya"* || "$FIRST_ACTIVITY_DESC" == *"Tokyo"* ]]; then
                echo "✅ SUCCESS: Specific location details found!"
            else
                echo "❌ FAILURE: Generic location descriptions"
            fi
            
        else
            echo "❌ FAILURE: No itinerary metadata found"
        fi
        
        echo ""
        echo "🔍 CHECKING FOR PLACEHOLDER TERMS:"
        echo "=================================="
        
        # Check for generic placeholder terms
        if [[ "$BOT_RESPONSE" == *"City Center"* ]]; then
            echo "❌ Found generic 'City Center' - placeholder detected"
        else
            echo "✅ No generic 'City Center' found"
        fi
        
        if [[ "$BOT_RESPONSE" == *"Cultural Quarter"* ]]; then
            echo "❌ Found generic 'Cultural Quarter' - placeholder detected"
        else
            echo "✅ No generic 'Cultural Quarter' found"
        fi
        
        if [[ "$BOT_RESPONSE" == *"Local Food Experience"* ]]; then
            echo "❌ Found generic 'Local Food Experience' - placeholder detected"  
        else
            echo "✅ No generic 'Local Food Experience' found"
        fi
    fi
    
    echo "---"
    sleep 0.2
done

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null

echo ""
echo "🎯 Real Data Test Complete"
echo "Check output above for placeholder vs real data comparison"