#!/bin/bash

# Test that destinations no longer ask experience question
echo "🎯 TESTING DESTINATION FLOW CHANGE"
echo "=================================="
echo "Testing that destinations skip experience question and go to duration"
echo ""

API_URL="http://localhost:3001/api/intelligent-conversation"

test_destination_flow() {
    local destination="$1"
    local description="$2"
    
    echo "🧪 Testing: $description"
    local conversation_id="dest-flow-$(date +%s)-$RANDOM"
    echo "  Input: '$destination'"
    
    local response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$destination\"}")
    
    local bot_response=$(echo "$response" | jq -r '.response')
    local extracted_dest=$(echo "$response" | jq -r '.conversationContext.tripContext.destination.primary // "missing"')
    
    echo "    Bot response: $(echo "$bot_response" | head -c 100)..."
    echo "    Extracted destination: $extracted_dest"
    
    # Check if it asks for experience type (should NOT)
    if [[ "$bot_response" =~ "What type of experience interests you most" ]]; then
        echo "    Status: ❌ Still asking experience question"
    elif [[ "$bot_response" =~ "How many days" ]]; then
        echo "    Status: ✅ Goes straight to duration question" 
    elif [[ "$bot_response" =~ "Which approach sounds more appealing" ]]; then
        echo "    Status: ✅ Special England response (expected)"
    else
        echo "    Status: ❓ Unclear response pattern"
    fi
    
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
    echo ""
}

# Test various destinations
echo "📋 Testing destination flow changes..."
echo ""

test_destination_flow "I want to visit Italy" "Known destination: Italy"
test_destination_flow "Let's go to France" "Known destination: France"  
test_destination_flow "I'm thinking about Japan" "Known destination: Japan"
test_destination_flow "How about Portugal?" "Extended destination: Portugal"
test_destination_flow "I want to visit Prague" "City destination: Prague"
test_destination_flow "Let's go to England" "Special case: England"
test_destination_flow "I want to visit Melbourne" "Unknown destination: Melbourne"

echo "🏁 Destination flow testing complete!"