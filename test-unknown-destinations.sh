#!/bin/bash

# Test unknown destination handling
echo "🗺️ UNKNOWN DESTINATION TESTING"
echo "==============================="
echo "Testing bot's response to destinations not in the known list"
echo ""

API_URL="http://localhost:3001/api/intelligent-conversation"

test_unknown_destination() {
    local destination="$1"
    local description="$2"
    local conversation_id="unknown-dest-$(date +%s)-$RANDOM"
    
    echo "🧪 TESTING: $description"
    echo "🆔 ID: $conversation_id"
    echo "  Input: '$destination'"
    
    local response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$destination\"}")
    
    local bot_response=$(echo "$response" | jq -r '.response')
    local extracted_dest=$(echo "$response" | jq -r '.conversationContext.tripContext.destination.primary // "missing"')
    
    echo "    Bot response: $(echo "$bot_response" | head -c 100)..."
    echo "    Extracted destination: $extracted_dest"
    
    # Check if bot asks where to go (indication it didn't recognize destination)
    if [[ "$bot_response" =~ "Where would you like to go" ]]; then
        echo "    Status: ❌ Not recognized (asked where to go)"
    elif [[ "$extracted_dest" != "missing" ]]; then
        echo "    Status: ✅ Recognized as: $extracted_dest"
    else
        echo "    Status: ❓ Unclear response"
    fi
    
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
    echo ""
}

# Test known destinations (should work)
echo "📋 TESTING KNOWN DESTINATIONS (should work)"
echo "==========================================="
test_unknown_destination "I want to visit Italy" "Known: Italy"
test_unknown_destination "Let's go to Japan" "Known: Japan"
test_unknown_destination "I'm thinking about France" "Known: France"

echo ""
echo "📋 TESTING UNKNOWN DESTINATIONS (current behavior)"
echo "================================================="

# Test unknown countries
test_unknown_destination "I want to visit Portugal" "Unknown country: Portugal"
test_unknown_destination "Let's go to Croatia" "Unknown country: Croatia"  
test_unknown_destination "I'm thinking about Peru" "Unknown country: Peru"
test_unknown_destination "How about Iceland?" "Unknown country: Iceland"
test_unknown_destination "I want to visit Morocco" "Unknown country: Morocco"

# Test unknown cities
test_unknown_destination "I want to visit Prague" "Unknown city: Prague"
test_unknown_destination "Let's go to Dublin" "Unknown city: Dublin"
test_unknown_destination "I'm thinking about Amsterdam" "Unknown city: Amsterdam"
test_unknown_destination "How about Vienna?" "Unknown city: Vienna"

# Test vague descriptions
test_unknown_destination "I want to go somewhere tropical" "Vague: tropical"
test_unknown_destination "I want to visit a European capital" "Vague: European capital"
test_unknown_destination "Somewhere with beaches" "Vague: beaches"
test_unknown_destination "A place with mountains" "Vague: mountains"

echo "🏁 Unknown destination testing complete!"