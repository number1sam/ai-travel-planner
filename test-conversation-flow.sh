#!/bin/bash

# Test conversation flow optimization 
echo "💬 CONVERSATION FLOW TESTING"
echo "============================"
echo "Testing conversation flow for redundancy and optimization opportunities"
echo ""

API_URL="http://localhost:3001/api/intelligent-conversation"

test_conversation_flow() {
    local test_name="$1"
    shift
    local messages=("$@")
    
    echo "🧪 FLOW TEST: $test_name"
    local conversation_id="flow-test-$(date +%s)-$RANDOM"
    echo "🆔 ID: $conversation_id"
    echo ""
    
    for i in "${!messages[@]}"; do
        local message="${messages[$i]}"
        local step=$((i + 1))
        
        echo "  Step $step: \"$message\""
        
        local response=$(curl -s -X POST "$API_URL" \
          -H "Content-Type: application/json" \
          -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$message\"}")
        
        local bot_response=$(echo "$response" | jq -r '.response')
        local current_intent=$(echo "$response" | jq -r '.conversationContext.tripContext.currentIntent // "none"')
        
        echo "    Bot: $(echo "$bot_response" | head -c 100)..."
        echo "    Intent: $current_intent"
        
        # Check for potential flow issues
        if [[ "$bot_response" =~ "I already have" ]]; then
            echo "    ⚠️  Redundancy detected in response"
        fi
        
        if [[ "$bot_response" =~ "Perfect!" && "$bot_response" =~ "What" ]]; then
            echo "    ✅ Good flow progression"
        fi
        
        echo ""
        sleep 0.1
    done
    
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
    echo "  ---"
    echo ""
}

# Test different conversation flows
echo "📋 TESTING CONVERSATION FLOWS"
echo "============================="

# Test 1: Optimal flow (should be smooth)
test_conversation_flow "Optimal Flow" \
    "I want to visit Italy" \
    "7 days" \
    "€3000" \
    "2 people" \
    "Milan" \
    "hotel" \
    "mid-range" \
    "culture and food" \
    "yes"

# Test 2: Information provided out of order
test_conversation_flow "Out of Order Flow" \
    "My budget is £2500" \
    "Italy" \
    "2 people" \
    "7 days" \
    "London" \
    "any accommodation" \
    "luxury" \
    "art and history"

# Test 3: Redundant information
test_conversation_flow "Redundant Information" \
    "France" \
    "7 days" \
    "7 days" \
    "€2000" \
    "2 people"

# Test 4: Mixed detailed and brief responses
test_conversation_flow "Mixed Response Length" \
    "I'm planning a trip to Japan for my honeymoon" \
    "14" \
    "We have about $8000 to spend" \
    "just the two of us" \
    "Tokyo Narita" \
    "traditional ryokan and some modern hotels" \
    "luxury experience" \
    "traditional culture, temples, and authentic food"

echo "🏁 Conversation flow testing complete!"