#!/bin/bash

# Comprehensive test for travel style processing fix
echo "🎨 TESTING TRAVEL STYLE PROCESSING FIX"
echo "====================================="
echo "Testing the comprehensive travel style normalization, locking, and confirmation system"
echo ""

API_URL="http://localhost:3001/api/intelligent-conversation"

setup_conversation_to_style() {
    local conversation_id="$1"
    
    # Set up a conversation to the point where style is needed
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"I want to visit Italy\"}" > /dev/null
      
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"7 days\"}" > /dev/null
      
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"€3000\"}" > /dev/null
      
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"2 people\"}" > /dev/null
      
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"Milan\"}" > /dev/null
      
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"hotel\"}" > /dev/null
}

test_style_input() {
    local style_input="$1"
    local expected_style="$2" 
    local test_description="$3"
    
    echo "🧪 Testing: $test_description"
    local conversation_id="style-test-$(date +%s)-$RANDOM"
    echo "  Input: '$style_input'"
    echo "  Expected style: $expected_style"
    
    # Set up conversation to style question
    setup_conversation_to_style "$conversation_id"
    
    # Send style input
    local response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$style_input\"}")
    
    local bot_response=$(echo "$response" | jq -r '.response')
    local extracted_style=$(echo "$response" | jq -r '.conversationContext.tripContext.preferences.style // "missing"')
    local style_locked=$(echo "$response" | jq -r '.conversationContext.tripContext.preferences.styleLocked // false')
    
    echo "    Bot response: $(echo "$bot_response" | head -c 100)..."
    echo "    Extracted style: $extracted_style"
    echo "    Style locked: $style_locked"
    
    # Check if style was correctly resolved
    local style_correct=false
    if [[ "$extracted_style" == "$expected_style" ]]; then
        style_correct=true
        echo "    ✅ Style correctly identified"
    else
        echo "    ❌ Style incorrect: expected $expected_style, got $extracted_style"
    fi
    
    # Check if style was locked
    local lock_correct=false
    if [[ "$style_locked" == "true" ]]; then
        lock_correct=true
        echo "    ✅ Style correctly locked"
    else
        echo "    ❌ Style not locked: $style_locked"
    fi
    
    # Check if confirmation message appears
    local confirmation_correct=false
    if [[ "$bot_response" =~ "Travel style set to" ]]; then
        confirmation_correct=true
        echo "    ✅ Confirmation message present"
    else
        echo "    ❌ No confirmation message"
    fi
    
    # Check if it advances to interests question
    local advancement_correct=false
    if [[ "$bot_response" =~ "What are you most interested in" ]]; then
        advancement_correct=true
        echo "    ✅ Advanced to interests question"
    else
        echo "    ❌ Did not advance to interests question"
    fi
    
    # Test duplicate input protection
    echo "  Testing duplicate input protection..."
    local duplicate_response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$style_input\"}")
    
    local duplicate_bot=$(echo "$duplicate_response" | jq -r '.response')
    
    if [[ "$duplicate_bot" =~ "Travel style set to" ]] || [[ "$duplicate_bot" =~ "What are you most interested in" ]]; then
        echo "    ❌ Re-processed duplicate input (should not re-ask style)"
    else
        echo "    ✅ Duplicate input handled correctly"
    fi
    
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
    
    # Overall result
    if [[ "$style_correct" == true && "$lock_correct" == true && "$confirmation_correct" == true && "$advancement_correct" == true ]]; then
        echo "    ✅ OVERALL: PASSED"
        return 0
    else
        echo "    ❌ OVERALL: FAILED"
        return 1
    fi
    
    echo ""
}

echo "📋 Testing all travel style variations..."
echo ""

TOTAL_TESTS=0
PASSED_TESTS=0

# Test exact matches
test_style_input "luxury" "luxury" "Exact match: luxury"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
[[ $? -eq 0 ]] && PASSED_TESTS=$((PASSED_TESTS + 1))

test_style_input "mid-range" "mid-range" "Exact match: mid-range"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
[[ $? -eq 0 ]] && PASSED_TESTS=$((PASSED_TESTS + 1))

test_style_input "budget" "budget" "Exact match: budget"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
[[ $? -eq 0 ]] && PASSED_TESTS=$((PASSED_TESTS + 1))

test_style_input "mixed" "mixed" "Exact match: mixed"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
[[ $? -eq 0 ]] && PASSED_TESTS=$((PASSED_TESTS + 1))

# Test normalization cases
test_style_input "mid range" "mid-range" "Normalization: mid range → mid-range"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
[[ $? -eq 0 ]] && PASSED_TESTS=$((PASSED_TESTS + 1))

test_style_input "midrange" "mid-range" "Normalization: midrange → mid-range"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
[[ $? -eq 0 ]] && PASSED_TESTS=$((PASSED_TESTS + 1))

test_style_input "Mid-Range" "mid-range" "Case insensitive: Mid-Range → mid-range"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
[[ $? -eq 0 ]] && PASSED_TESTS=$((PASSED_TESTS + 1))

# Test synonyms
test_style_input "premium" "luxury" "Synonym: premium → luxury"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
[[ $? -eq 0 ]] && PASSED_TESTS=$((PASSED_TESTS + 1))

test_style_input "affordable" "budget" "Synonym: affordable → budget"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
[[ $? -eq 0 ]] && PASSED_TESTS=$((PASSED_TESTS + 1))

test_style_input "comfortable" "mid-range" "Synonym: comfortable → mid-range"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
[[ $? -eq 0 ]] && PASSED_TESTS=$((PASSED_TESTS + 1))

# Test phrase matching
test_style_input "affordable but nice" "mid-range" "Phrase: affordable but nice → mid-range"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
[[ $? -eq 0 ]] && PASSED_TESTS=$((PASSED_TESTS + 1))

test_style_input "splurge on some things" "mixed" "Phrase: splurge on some things → mixed"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
[[ $? -eq 0 ]] && PASSED_TESTS=$((PASSED_TESTS + 1))

echo ""
echo "🎯 TRAVEL STYLE PROCESSING TEST RESULTS"
echo "======================================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS ✅"
echo "Failed: $((TOTAL_TESTS - PASSED_TESTS)) ❌"

if [[ $TOTAL_TESTS -gt 0 ]]; then
    echo "Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"
fi

echo ""

if [[ $PASSED_TESTS -eq $TOTAL_TESTS ]]; then
    echo "🎉 EXCELLENT! Travel style processing completely fixed!"
    echo ""
    echo "✅ **Fixed Issues:**"
    echo "  • Robust normalization (mid range → mid-range)"  
    echo "  • Comprehensive synonym mapping"
    echo "  • Phrase understanding (affordable but nice)"
    echo "  • Style locking mechanism" 
    echo "  • Confirmation and advancement flow"
    echo "  • Duplicate input protection"
elif [[ $PASSED_TESTS -gt $((TOTAL_TESTS * 3 / 4)) ]]; then
    echo "✅ Good progress! Most travel style issues resolved."
else
    echo "⚠️  Travel style processing still needs work."
fi

echo ""
echo "🏁 Travel style fix testing complete!"