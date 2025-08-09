#!/bin/bash

# Debug script for itinerary generation issue
# Recreates the exact scenario from the user's conversation

echo "🔍 Debugging Itinerary Generation Issue"
echo "======================================"

CONVERSATION_ID="debug-itinerary-$(date +%s)"
API_URL="http://localhost:3000/api/intelligent-conversation"

echo "🆔 Debug Conversation ID: $CONVERSATION_ID"
echo ""

# Recreate the exact conversation flow that led to the issue
declare -a MESSAGES=(
    "i would live to go to Japan"
    "i would like a mix of them all , big modern cities, and small traditional villigase" 
    "14 days"
    "£3000"
    "2"
    "London"
    "hotels"
    "Budget , and mid range"
    "relaxing, adventure, , history , culture, food and mdern"
    "yes"
    "ok please continue"
)

declare -a DESCRIPTIONS=(
    "User wants to go to Japan"
    "User wants mix of cities and villages"
    "User provides 14 days duration" 
    "User provides £3000 budget"
    "User provides 2 travelers"
    "User provides London departure"
    "User chooses hotels"
    "User chooses budget/mid-range style"
    "User lists interests"
    "User confirms itinerary generation"
    "User encourages continuation"
)

echo "🎯 RECREATING EXACT USER CONVERSATION"
echo "=================================="

for i in "${!MESSAGES[@]}"; do
    MESSAGE="${MESSAGES[$i]}"
    DESCRIPTION="${DESCRIPTIONS[$i]}"
    STEP=$((i + 1))
    
    echo ""
    echo "📝 Step $STEP: $DESCRIPTION"
    echo "User: \"$MESSAGE\""
    echo ""
    
    # Send message with detailed debugging
    RESPONSE=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"conversationId\": \"$CONVERSATION_ID\",
        \"message\": \"$MESSAGE\"
      }")
    
    if [[ -z "$RESPONSE" ]]; then
        echo "❌ ERROR: No response received"
        exit 1
    fi
    
    # Extract key information
    BOT_RESPONSE=$(echo "$RESPONSE" | jq -r '.response // empty')
    CURRENT_INTENT=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.currentIntent // empty')
    NEXT_EXPECTED=$(echo "$RESPONSE" | jq -r '.conversationContext.tripContext.nextExpected // empty') 
    ITINERARY_GENERATED=$(echo "$RESPONSE" | jq -r '.metadata.itineraryGenerated // false')
    ITINERARY_EXISTS=$(echo "$RESPONSE" | jq -r '.itinerary // empty')
    MESSAGE_COUNT=$(echo "$RESPONSE" | jq -r '.conversationContext.messageCount // 0')
    
    echo "🤖 Bot Response: $BOT_RESPONSE"
    echo ""
    echo "🔧 Debug Info:"
    echo "  Current Intent: $CURRENT_INTENT"
    echo "  Next Expected: $NEXT_EXPECTED"
    echo "  Itinerary Generated: $ITINERARY_GENERATED"
    echo "  Itinerary Data Exists: $(if [[ "$ITINERARY_EXISTS" != "empty" && "$ITINERARY_EXISTS" != "null" ]]; then echo "YES"; else echo "NO"; fi)"
    echo "  Message Count: $MESSAGE_COUNT"
    echo ""
    
    # Critical analysis for steps 10 and 11 (the yes confirmation)
    if [[ $STEP == 10 ]]; then
        echo "🚨 CRITICAL STEP 10 ANALYSIS:"
        echo "  Expected: currentIntent should be 'generating_itinerary'"
        echo "  Actual: $CURRENT_INTENT"
        
        if [[ "$CURRENT_INTENT" == "generating_itinerary" ]]; then
            echo "  ✅ Intent set correctly"
        else
            echo "  ❌ Intent NOT set correctly - THIS IS THE BUG!"
        fi
        
        if [[ "$ITINERARY_GENERATED" == "true" ]]; then
            echo "  ✅ Itinerary generation flag set"
        else
            echo "  ❌ Itinerary generation flag NOT set"
        fi
    fi
    
    if [[ $STEP == 11 ]]; then
        echo "🚨 CRITICAL STEP 11 ANALYSIS:"
        echo "  Expected: Bot should continue with itinerary or show completion"
        echo "  Actual Response: $BOT_RESPONSE"
        
        if [[ "$BOT_RESPONSE" =~ "Perfect! I have all the essential details" ]]; then
            echo "  ❌ BUG CONFIRMED: Bot reset to confirmation instead of continuing!"
        elif [[ "$BOT_RESPONSE" =~ "itinerary is ready" ]]; then
            echo "  ✅ Bot completed itinerary generation"
        else
            echo "  ⚠️  Unexpected response pattern"
        fi
        
        if [[ "$ITINERARY_EXISTS" != "empty" && "$ITINERARY_EXISTS" != "null" ]]; then
            echo "  ✅ Itinerary data present in response"
            echo "  📊 Itinerary data: $(echo "$ITINERARY_EXISTS" | head -c 100)..."
        else
            echo "  ❌ NO ITINERARY DATA in response - THIS IS THE BUG!"
        fi
    fi
    
    echo "---"
    
    # Short delay between requests
    sleep 0.3
done

echo ""
echo "========================================="
echo "🔍 ITINERARY GENERATION DEBUG SUMMARY"  
echo "========================================="
echo ""

# Get final conversation state
FINAL_STATE=$(curl -s -X GET "$API_URL?conversationId=$CONVERSATION_ID")
FINAL_MESSAGES=$(echo "$FINAL_STATE" | jq -r '.messages // [] | length')
FINAL_CONTEXT=$(echo "$FINAL_STATE" | jq -r '.tripContext // {}')

echo "📊 Final Conversation State:"
echo "  Total Messages: $FINAL_MESSAGES"
echo "  Final Context: $(echo "$FINAL_CONTEXT" | head -c 200)..."
echo ""

echo "🎯 Root Cause Analysis:"
echo "1. Check if 'yes' response triggers intent change to 'generating_itinerary'"
echo "2. Check if API detects 'generating_itinerary' intent and calls generateItineraryFromContext()"
echo "3. Check if system message handling works for SYSTEM_ITINERARY_GENERATED"
echo "4. Check if itinerary data gets returned to frontend properly"
echo "5. Check why user saying 'ok please continue' causes reset"
echo ""

echo "🔧 Next Debugging Steps:"
echo "- Add more logging to UnifiedConversationManager.processUserInput()"
echo "- Add logging to API route itinerary generation section"
echo "- Test system message handling in isolation"
echo "- Check conversation state persistence during complex operations"

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null