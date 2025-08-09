#!/bin/bash

# Final test of historical destinations logic
echo "🏛️ FINAL HISTORICAL DESTINATIONS TEST"
echo "===================================="
echo "Testing the completed historical destinations logic"
echo ""

API_URL="http://localhost:3001/api/intelligent-conversation"

test_quick() {
    local destination="$1"
    local expected="$2"
    
    echo "Testing: $destination"
    local conversation_id="final-hist-$(date +%s)-$RANDOM"
    
    local response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$destination\"}")
    
    local bot_response=$(echo "$response" | jq -r '.response')
    
    if [[ "$bot_response" =~ "What type of experience interests you most" ]]; then
        if [[ "$expected" == "experience" ]]; then
            echo "  ✅ Correctly asks experience question"
        else
            echo "  ❌ Should NOT ask experience question"
        fi
    elif [[ "$bot_response" =~ "How many days" ]]; then
        if [[ "$expected" == "duration" ]]; then
            echo "  ✅ Correctly goes to duration"
        else
            echo "  ❌ Should ask experience question"
        fi
    else
        echo "  ❓ Other response pattern"
    fi
    
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
}

echo "📋 Historical destinations (should ask experience):"
test_quick "I want to visit Italy" "experience"
test_quick "Let's go to Greece" "experience"  
test_quick "How about Egypt?" "experience"
test_quick "I want to visit Japan" "experience"
test_quick "Turkey" "experience"

echo ""
echo "📋 Non-historical destinations (should ask duration):"
test_quick "I want to visit France" "duration"
test_quick "Let's go to Spain" "duration"
test_quick "How about Norway?" "duration"
test_quick "Portugal" "duration"
test_quick "Australia" "duration"

echo ""
echo "🏁 Final historical test complete!"