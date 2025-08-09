#!/bin/bash

# Test specific conversation flow fixes
echo "🔧 TESTING FLOW FIXES"
echo "===================="
echo "Testing specific issues identified in conversation flow"
echo ""

API_URL="http://localhost:3001/api/intelligent-conversation"

test_fix() {
    local test_name="$1"
    local input="$2"
    local expected_behavior="$3"
    
    echo "🧪 TESTING FIX: $test_name"
    local conversation_id="fix-test-$(date +%s)-$RANDOM"
    echo "  Input: '$input'"
    echo "  Expected: $expected_behavior"
    
    # Set up context if needed
    if [[ "$test_name" == *"Origin"* ]]; then
        # Set up destination and travelers first
        curl -s -X POST "$API_URL" \
          -H "Content-Type: application/json" \
          -d "{\"conversationId\": \"$conversation_id\", \"message\": \"Italy\"}" > /dev/null
        
        curl -s -X POST "$API_URL" \
          -H "Content-Type: application/json" \
          -d "{\"conversationId\": \"$conversation_id\", \"message\": \"7 days\"}" > /dev/null
          
        curl -s -X POST "$API_URL" \
          -H "Content-Type: application/json" \
          -d "{\"conversationId\": \"$conversation_id\", \"message\": \"€3000\"}" > /dev/null
          
        curl -s -X POST "$API_URL" \
          -H "Content-Type: application/json" \
          -d "{\"conversationId\": \"$conversation_id\", \"message\": \"2 people\"}" > /dev/null
    fi
    
    local response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$input\"}")
    
    local bot_response=$(echo "$response" | jq -r '.response')
    local extracted_dest=$(echo "$response" | jq -r '.conversationContext.tripContext.destination.primary // "missing"')
    local extracted_origin=$(echo "$response" | jq -r '.conversationContext.tripContext.origin // "missing"')
    local extracted_budget=$(echo "$response" | jq -r '.conversationContext.tripContext.budget.total // "missing"')
    
    echo "    Bot response: $(echo "$bot_response" | head -c 100)..."
    echo "    Extracted destination: $extracted_dest"
    echo "    Extracted origin: $extracted_origin" 
    echo "    Extracted budget: $extracted_budget"
    
    # Check specific fixes
    case "$test_name" in
        *"Honeymoon"*)
            if [[ "$bot_response" =~ "Moon" ]]; then
                echo "    Status: ❌ Still incorrectly parsing honeymoon as moon"
            else
                echo "    Status: ✅ Honeymoon parsing fixed"
            fi
            ;;
        *"Budget"*)
            if [[ "$extracted_budget" == "8000" ]]; then
                echo "    Status: ✅ Budget extraction fixed"
            else
                echo "    Status: ❌ Budget still not extracting correctly: $extracted_budget"
            fi
            ;;
        *"Origin"*)
            if [[ "$extracted_origin" == "Milan" || "$extracted_origin" =~ "Milan" ]]; then
                echo "    Status: ✅ Origin extraction fixed"
            else
                echo "    Status: ❌ Origin still not extracting: $extracted_origin"
            fi
            ;;
    esac
    
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
    echo ""
}

# Test the specific fixes
test_fix "Honeymoon Parsing" "I'm planning a trip to Japan for my honeymoon" "Should recognize Japan, not Moon"
test_fix "Budget Extraction" "\$8000" "Should extract 8000 as budget amount"
test_fix "Origin Extraction" "Milan" "Should extract Milan as departure city"

# Test additional edge cases
test_fix "Budget with Text" "We have about \$8000 to spend" "Should extract 8000"
test_fix "Budget Different Format" "Our budget is around 5000 dollars" "Should handle dollars keyword"

echo "🏁 Flow fixes testing complete!"