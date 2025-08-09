#!/bin/bash

# Test to reproduce question repetition issues from user conversation
echo "🔍 Testing Question Repetition Issues"
echo "==================================="

CONVERSATION_ID="repetition-test-$(date +%s)"
API_URL="http://localhost:3000/api/intelligent-conversation"

echo "🆔 Test ID: $CONVERSATION_ID"
echo ""

# Recreate the exact problematic sequence from user's conversation
declare -a MESSAGES=(
    "i would live to go to Japan"
    "i would like a mix of them all , big modern cities, and small traditional villigase"
    "two weeks #"        # This caused repetition in original
    "14 days"            # User had to answer again
    "£3000"
    "2"
    "Heathrow"           # This caused repetition in original
    "London"             # User had to answer again
    "hotels"
    "Budget , and mid range"
    "relaxing, adventure, , history , culture, food and mdern"
)

declare -a EXPECTED_NO_REPEAT=(
    "duration question"
    "budget question" 
    "travelers question"
    "origin question"
    "accommodation question"
    "style question"
    "interests question"
    "confirmation question"
)

echo "🎯 TESTING FOR QUESTION REPETITION"
echo "================================="

PREVIOUS_RESPONSE=""

for i in "${!MESSAGES[@]}"; do
    MESSAGE="${MESSAGES[$i]}"
    STEP=$((i + 1))
    
    echo ""
    echo "📝 Step $STEP: \"$MESSAGE\""
    
    RESPONSE=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$CONVERSATION_ID\", \"message\": \"$MESSAGE\"}")
    
    BOT_RESPONSE=$(echo "$RESPONSE" | jq -r '.response')
    MESSAGE_COUNT=$(echo "$RESPONSE" | jq -r '.conversationContext.messageCount // 0')
    
    echo "🤖 Bot: $(echo "$BOT_RESPONSE" | head -c 150)..."
    echo "📊 Messages: $MESSAGE_COUNT"
    
    # Check for repetition by comparing with previous response
    if [[ "$BOT_RESPONSE" == "$PREVIOUS_RESPONSE" ]]; then
        echo "❌ REPETITION DETECTED: Bot gave identical response to previous!"
        echo "This indicates the bot didn't understand the user's input."
    else
        echo "✅ No identical repetition detected"
    fi
    
    # Specific checks for problematic sequences
    if [[ $STEP == 3 && "$MESSAGE" == "two weeks #" ]]; then
        if [[ "$BOT_RESPONSE" =~ "how many days" ]]; then
            echo "⚠️  Bot didn't understand 'two weeks #' - this could cause repetition"
        else
            echo "✅ Bot understood 'two weeks' correctly"
        fi
    fi
    
    if [[ $STEP == 7 && "$MESSAGE" == "Heathrow" ]]; then
        if [[ "$BOT_RESPONSE" =~ "where will you be departing" ]]; then
            echo "⚠️  Bot didn't understand 'Heathrow' - this could cause repetition"
        else
            echo "✅ Bot understood 'Heathrow' as departure location"
        fi
    fi
    
    # Store current response for next comparison
    PREVIOUS_RESPONSE="$BOT_RESPONSE"
    
    echo "---"
    sleep 0.3
done

# Cleanup
curl -s -X DELETE "$API_URL?conversationId=$CONVERSATION_ID" > /dev/null

echo ""
echo "🎯 Question Repetition Analysis Complete"
echo "Check the output above for any repetition issues"