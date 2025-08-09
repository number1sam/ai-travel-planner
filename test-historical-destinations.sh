#!/bin/bash

# Test historical destinations experience question logic
echo "🏛️ TESTING HISTORICAL DESTINATIONS LOGIC"
echo "========================================"
echo "Testing that only historically rich destinations get experience question"
echo ""

API_URL="http://localhost:3001/api/intelligent-conversation"

test_destination_history() {
    local destination="$1"
    local expected_behavior="$2"
    local description="$3"
    
    echo "🧪 Testing: $description"
    local conversation_id="history-test-$(date +%s)-$RANDOM"
    echo "  Input: '$destination'"
    echo "  Expected: $expected_behavior"
    
    local response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$destination\"}")
    
    local bot_response=$(echo "$response" | jq -r '.response')
    local extracted_dest=$(echo "$response" | jq -r '.conversationContext.tripContext.destination.primary // "missing"')
    
    echo "    Bot response: $(echo "$bot_response" | head -c 100)..."
    echo "    Extracted destination: $extracted_dest"
    
    # Check behavior
    if [[ "$bot_response" =~ "What type of experience interests you most" ]]; then
        if [[ "$expected_behavior" == "experience_question" ]]; then
            echo "    Status: ✅ Correctly asks experience question"
        else
            echo "    Status: ❌ Should NOT ask experience question"
        fi
    elif [[ "$bot_response" =~ "How many days" ]]; then
        if [[ "$expected_behavior" == "duration_question" ]]; then
            echo "    Status: ✅ Correctly goes to duration"
        else
            echo "    Status: ❌ Should ask experience question"
        fi
    else
        echo "    Status: ❓ Unexpected response pattern"
    fi
    
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
    echo ""
}

echo "📋 Testing historical destinations (should ask experience question)..."
echo ""

test_destination_history "I want to visit Italy" "experience_question" "Historical: Italy"
test_destination_history "Let's go to Greece" "experience_question" "Historical: Greece"
test_destination_history "I'm thinking about Japan" "experience_question" "Historical: Japan"
test_destination_history "How about Egypt?" "experience_question" "Historical: Egypt"
test_destination_history "I want to visit Turkey" "experience_question" "Historical: Turkey"
test_destination_history "Let's go to Peru" "experience_question" "Historical: Peru"

echo "📋 Testing non-historical destinations (should go to duration)..."
echo ""

test_destination_history "I want to visit France" "duration_question" "Non-historical: France"
test_destination_history "Let's go to Spain" "duration_question" "Non-historical: Spain"
test_destination_history "How about Portugal?" "duration_question" "Non-historical: Portugal"
test_destination_history "I want to visit Norway" "duration_question" "Non-historical: Norway"
test_destination_history "Let's go to Australia" "duration_question" "Non-historical: Australia"

echo "🏁 Historical destinations testing complete!"