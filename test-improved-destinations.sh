#!/bin/bash

# Test improved destination handling - focus on edge cases
echo "🔧 IMPROVED DESTINATION TESTING"
echo "==============================="
echo "Testing edge cases and improvements"
echo ""

API_URL="http://localhost:3001/api/intelligent-conversation"

test_destination() {
    local input="$1"
    local description="$2"
    local conversation_id="improved-dest-$(date +%s)-$RANDOM"
    
    echo "🧪 TESTING: $description"
    echo "  Input: '$input'"
    
    local response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$input\"}")
    
    local bot_response=$(echo "$response" | jq -r '.response')
    local extracted_dest=$(echo "$response" | jq -r '.conversationContext.tripContext.destination.primary // "missing"')
    
    echo "    Bot response: $(echo "$bot_response" | head -c 80)..."
    echo "    Extracted: $extracted_dest"
    
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
    echo ""
}

# Test the problematic cases
echo "📋 TESTING EDGE CASES"
echo "===================="

test_destination "I want to visit a European capital" "Should NOT extract European"
test_destination "Somewhere with beaches" "Should NOT extract Somewhere" 
test_destination "A place with mountains" "Should NOT extract anything"
test_destination "I want to go somewhere tropical" "Should NOT extract tropical"

# Test valid destinations that should work
echo "📋 TESTING VALID DESTINATIONS"
echo "============================"

test_destination "I want to visit Melbourne" "Should extract Melbourne"
test_destination "How about Singapore?" "Should extract Singapore"
test_destination "Let's go to Bali" "Should extract Bali"
test_destination "I'm thinking about Egypt" "Should extract Egypt"

echo "🏁 Improved destination testing complete!"