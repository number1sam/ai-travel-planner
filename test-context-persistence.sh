#!/bin/bash

# Test context persistence through complex operations
echo "🔍 Testing Context Persistence Through Complex Operations"
echo "========================================================"

CONVERSATION_ID="context-persist-$(date +%s)"
API_URL="http://localhost:3000/api/intelligent-conversation"

echo "🆔 Test ID: $CONVERSATION_ID"
echo ""

# Test specific context persistence issues during itinerary generation
declare -a SETUP_MESSAGES=(
    "I want to go to Japan"
    "14 days" 
    "£3000"
    "2"
    "London Heathrow"
    "hotel"
    "mid-range"
    "food and culture"
)

declare -a TEST_MESSAGES=(
    "yes"  # Trigger itinerary generation
    "Can you tell me more about day 3?"  # Test context after generation
    "What's my total budget again?"      # Test budget context persists  
    "How many people are traveling?"     # Test traveler context persists
    "What hotel are we staying at?"      # Test hotel context persists
)

echo "🏗️  SETUP PHASE - Building trip context"
echo "======================================"

# Setup the conversation context
for i in "${!SETUP_MESSAGES[@]}"; do
    MESSAGE="${SETUP_MESSAGES[$i]}"
    STEP=$((i + 1))
    
    echo "Setup $STEP: \"$MESSAGE\""
    
    RESPONSE=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"$MESSAGE\"}")
    
    BOT_RESPONSE=$(echo "$RESPONSE" | jq -r '.response')
    echo "Bot: $(echo "$BOT_RESPONSE" | head -c 80)..."
    echo ""
    sleep 0.2
done

echo "🧪 PERSISTENCE TEST PHASE - Testing context during operations"  
echo "============================================================"

# Test context persistence through operations
for i in "${!TEST_MESSAGES[@]}"; do
    MESSAGE="${TEST_MESSAGES[$i]}"
    STEP=$((i + 1))
    
    echo "Test $STEP: \"$MESSAGE\""
    
    RESPONSE=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"$MESSAGE\"}")
    
    BOT_RESPONSE=$(echo "$RESPONSE" | jq -r '.response')
    CURRENT_INTENT=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.currentIntent // "none"')
    MESSAGE_COUNT=$(echo "$RESPONSE" | jq -r '.conversationContext.messageCount // 0')
    
    # Extract context data for verification
    BUDGET_TOTAL=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.budget.total // "missing"')
    BUDGET_CURRENCY=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.budget.currency // "missing"')
    TRAVELERS=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.travelers.adults // "missing"')
    DESTINATION=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.destination.primary // "missing"')
    DURATION=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.dates.duration // "missing"')
    ORIGIN=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.origin // "missing"')
    
    echo "🤖 Bot: $(echo "$BOT_RESPONSE" | head -c 120)..."
    echo "📊 Intent: $CURRENT_INTENT | Messages: $MESSAGE_COUNT"
    echo "🔧 Context Check:"
    echo "   - Budget: $BUDGET_TOTAL $BUDGET_CURRENCY"  
    echo "   - Travelers: $TRAVELERS people"
    echo "   - Destination: $DESTINATION" 
    echo "   - Duration: $DURATION days"
    echo "   - Origin: $ORIGIN"
    echo ""
    
    # Specific validation checks
    case $STEP in
        1)
            if [[ "$CURRENT_INTENT" == "itinerary_completed" ]]; then
                echo "✅ SUCCESS: Itinerary generation completed properly"
            else
                echo "❌ FAILURE: Itinerary not completed - Intent: $CURRENT_INTENT"
            fi
            ;;
        2)
            if [[ "$BOT_RESPONSE" =~ "day 3" && "$DESTINATION" == "Japan" ]]; then
                echo "✅ SUCCESS: Context preserved - knows about Japan and day 3"
            else
                echo "❌ FAILURE: Lost context during operation"
            fi
            ;;
        3)  
            if [[ "$BOT_RESPONSE" =~ "3000" || "$BOT_RESPONSE" =~ "£3,000" ]]; then
                echo "✅ SUCCESS: Budget context preserved after generation"
            else
                echo "❌ FAILURE: Budget context lost - Bot: $(echo "$BOT_RESPONSE" | head -c 100)"
            fi
            ;;
        4)
            if [[ "$BOT_RESPONSE" =~ "2" && "$TRAVELERS" == "2" ]]; then
                echo "✅ SUCCESS: Traveler context preserved"
            else
                echo "❌ FAILURE: Traveler context lost - Expected 2, got $TRAVELERS"
            fi
            ;;
        5)
            if [[ "$BOT_RESPONSE" =~ "Japan Central Hotel" ]]; then
                echo "✅ SUCCESS: Hotel context preserved from generation"
            else
                echo "❌ FAILURE: Hotel context lost after generation"
            fi
            ;;
    esac
    
    echo "---"
    sleep 0.3
done

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null

echo ""
echo "🎯 Context Persistence Test Complete"
echo "Check output above for any context loss issues during complex operations"