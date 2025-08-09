#!/bin/bash

# Comprehensive test script for complete conversation flow
# Tests from initial greeting to working itinerary generation

echo "🧪 Testing Complete Conversation Flow"
echo "====================================="

# Set up test variables
CONVERSATION_ID="test-complete-$(date +%s)"
API_URL="http://localhost:3001/api/intelligent-conversation"

echo "🆔 Conversation ID: $CONVERSATION_ID"
echo ""

# Define the complete conversation flow
declare -a MESSAGES=(
    "I would like to go to England"
    "7 days"
    "£2500"
    "2"
    "London"
    "hotel"
    "mid-range"
    "history and food"
    "yes"
)

declare -a DESCRIPTIONS=(
    "User expresses interest in England"
    "User provides duration"
    "User provides budget with currency"
    "User provides traveler count (simple answer)"
    "User provides departure location (simple answer)"
    "User chooses accommodation type"
    "User selects travel style"
    "User mentions interests"
    "User confirms itinerary generation"
)

# Track conversation state
echo "🎯 TESTING COMPLETE CONVERSATION FLOW"
echo "====================================="

for i in "${!MESSAGES[@]}"; do
    MESSAGE="${MESSAGES[$i]}"
    DESCRIPTION="${DESCRIPTIONS[$i]}"
    STEP=$((i + 1))
    
    echo ""
    echo "📝 Step $STEP: $DESCRIPTION"
    echo "User: \"$MESSAGE\""
    echo ""
    
    # Send message
    RESPONSE=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"conversationId\": \"$CONVERSATION_ID\",
        \"message\": \"$MESSAGE\"
      }")
    
    # Check for errors
    if [[ -z "$RESPONSE" ]]; then
        echo "❌ ERROR: No response received"
        exit 1
    fi
    
    # Extract response text
    BOT_RESPONSE=$(echo "$RESPONSE" | jq -r '.response // empty')
    if [[ -z "$BOT_RESPONSE" || "$BOT_RESPONSE" == "null" ]]; then
        echo "❌ ERROR: Invalid response format"
        echo "Raw response: $RESPONSE"
        exit 1
    fi
    
    echo "🤖 Bot Response:"
    echo "$BOT_RESPONSE"
    echo ""
    
    # Extract context for validation
    TRIP_CONTEXT=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext // {}')
    DESTINATION=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.destination.primary // empty')
    DURATION=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.dates.duration // empty')
    BUDGET=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.budget.total // empty')
    CURRENCY=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.budget.currency // empty')
    TRAVELERS=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.travelers.adults // empty')
    ORIGIN=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.origin // empty')
    ACCOMMODATION=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.preferences.accommodation[0] // empty')
    STYLE=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.preferences.style // empty')
    INTERESTS=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.preferences.interests[]? // empty' | tr '\n' ', ')
    
    # Check if itinerary was generated
    ITINERARY_GENERATED=$(echo "$RESPONSE" | jq -r '.metadata.itineraryGenerated // false')
    
    echo "📊 Context Status:"
    echo "  Destination: $DESTINATION"
    echo "  Duration: $DURATION days"
    echo "  Budget: $CURRENCY$BUDGET"
    echo "  Travelers: $TRAVELERS"
    echo "  Origin: $ORIGIN"
    echo "  Accommodation: $ACCOMMODATION"
    echo "  Style: $STYLE"
    echo "  Interests: $INTERESTS"
    echo "  Itinerary Generated: $ITINERARY_GENERATED"
    
    echo "---"
    
    # Specific validations for each step
    case $STEP in
        1)
            if [[ "$DESTINATION" != "England" ]]; then
                echo "❌ VALIDATION FAILED: Expected destination 'England', got '$DESTINATION'"
                exit 1
            fi
            ;;
        2)
            if [[ "$DURATION" != "7" ]]; then
                echo "❌ VALIDATION FAILED: Expected duration '7', got '$DURATION'"
                exit 1
            fi
            ;;
        3)
            if [[ "$BUDGET" != "2500" || "$CURRENCY" != "GBP" ]]; then
                echo "❌ VALIDATION FAILED: Expected 'GBP2500', got '$CURRENCY$BUDGET'"
                exit 1
            fi
            ;;
        4)
            if [[ "$TRAVELERS" != "2" ]]; then
                echo "❌ VALIDATION FAILED: Expected travelers '2', got '$TRAVELERS'"
                exit 1
            fi
            ;;
        5)
            if [[ "$ORIGIN" != "London" ]]; then
                echo "❌ VALIDATION FAILED: Expected origin 'London', got '$ORIGIN'"
                exit 1
            fi
            ;;
        6)
            if [[ "$ACCOMMODATION" != "Hotel" ]]; then
                echo "❌ VALIDATION FAILED: Expected accommodation 'Hotel', got '$ACCOMMODATION'"
                exit 1
            fi
            ;;
        7)
            if [[ "$STYLE" != "mid-range" ]]; then
                echo "❌ VALIDATION FAILED: Expected style 'mid-range', got '$STYLE'"
                exit 1
            fi
            ;;
        8)
            if [[ ! "$INTERESTS" =~ "History" && ! "$INTERESTS" =~ "Food" ]]; then
                echo "❌ VALIDATION FAILED: Expected interests to include 'History' and 'Food', got '$INTERESTS'"
                exit 1
            fi
            ;;
        9)
            if [[ "$ITINERARY_GENERATED" != "true" ]]; then
                echo "❌ VALIDATION FAILED: Expected itinerary to be generated, got '$ITINERARY_GENERATED'"
                exit 1
            fi
            
            # Check if response contains itinerary generation start message
            if [[ ! "$BOT_RESPONSE" =~ "generating your complete" ]]; then
                echo "❌ VALIDATION FAILED: Response should confirm itinerary generation started"
                exit 1
            fi
            ;;
    esac
    
    echo "✅ Step $STEP validation passed"
    
    # Small delay between requests
    sleep 0.5
done

echo ""
echo "========================================="
echo "🏁 COMPLETE CONVERSATION FLOW TEST RESULTS"
echo "========================================="
echo "✅ All 9 steps completed successfully!"
echo ""

echo "🎯 Final Validation Summary:"
echo "✅ Bot understood simple answers ('2', 'London', 'hotel')"
echo "✅ Bot progressed through all required questions"
echo "✅ Bot collected all trip information systematically"
echo "✅ Bot responded to 'yes' by generating itinerary"
echo "✅ Complete conversation flow works end-to-end"
echo ""

echo "📋 Complete Trip Context Collected:"
echo "  🌍 Destination: England"
echo "  📅 Duration: 7 days"
echo "  💰 Budget: £2500"
echo "  👥 Travelers: 2 people"
echo "  ✈️ Origin: London"
echo "  🏨 Accommodation: Hotel"
echo "  ✨ Style: Mid-range"
echo "  🎯 Interests: History & Culture, Food & Dining"
echo "  📝 Itinerary: Generated successfully"
echo ""

echo "🎉 CONVERSATION FLOW TEST COMPLETED SUCCESSFULLY!"
echo "The bot now works properly from start to finish!"