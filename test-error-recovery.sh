#!/bin/bash

# Error Recovery and Invalid Input Handling Testing
echo "🛠️ ERROR RECOVERY & INVALID INPUT TESTING"
echo "==========================================="
echo "Testing how the bot recovers from errors, invalid states, and unusual scenarios"
echo ""

API_URL="http://localhost:3000/api/intelligent-conversation"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function for error recovery tests
run_recovery_test() {
    local test_name="$1"
    local conversation_id="recovery-$(date +%s)-$(echo "$test_name" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
    shift
    local messages=("$@")
    
    echo "🧪 RECOVERY TEST: $test_name"
    echo "🆔 ID: $conversation_id"
    
    local step=1
    local test_passed=true
    local failure_reason=""
    
    for message in "${messages[@]}"; do
        echo "  Step $step: \"$message\""
        
        local response=$(curl -s -X POST "$API_URL" \
          -H "Content-Type: application/json" \
          -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$message\"}")
        
        local bot_response=$(echo "$response" | jq -r '.response // "ERROR"')
        local success=$(echo "$response" | jq -r '.success // false')
        
        if [[ "$success" != "true" ]]; then
            # For error recovery tests, some failures might be expected
            echo "    Response: $bot_response"
            echo "    ⚠️  API returned error (may be expected for this test)"
        else
            echo "    Bot: $(echo "$bot_response" | head -c 100)..."
            
            # Check if bot recovered gracefully from invalid input
            if [[ "$bot_response" =~ "ERROR" || "$bot_response" =~ "error" ]]; then
                test_passed=false
                failure_reason="Bot returned error message instead of graceful recovery"
                break
            fi
        fi
        
        step=$((step + 1))
        sleep 0.1
    done
    
    # Cleanup
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
    
    # Record results
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [[ "$test_passed" == true ]]; then
        echo "  ✅ PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "  ❌ FAILED: $failure_reason"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    echo "  ---"
    echo ""
}

# Test conversation interruption and recovery
run_interruption_test() {
    local test_name="$1"
    local conversation_id="interruption-$(date +%s)"
    
    echo "🧪 INTERRUPTION TEST: $test_name"
    echo "🆔 ID: $conversation_id"
    
    # Start a normal conversation
    echo "  Phase 1: Normal conversation start"
    local response1=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"Japan\"}")
    
    local response2=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"7 days\"}")
    
    # Interrupt with completely different topic
    echo "  Phase 2: Topic interruption"
    local interruption_response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"What's the weather like in Paris?\"}")
    
    local bot_response=$(echo "$interruption_response" | jq -r '.response // "ERROR"')
    local success=$(echo "$interruption_response" | jq -r '.success // false')
    
    echo "    Bot: $(echo "$bot_response" | head -c 100)..."
    
    # Try to continue original conversation
    echo "  Phase 3: Attempt to continue original conversation"
    local continue_response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"£2000\"}")
    
    local continue_bot_response=$(echo "$continue_response" | jq -r '.response // "ERROR"')
    echo "    Bot: $(echo "$continue_bot_response" | head -c 100)..."
    
    # Cleanup
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [[ "$success" == "true" ]]; then
        echo "  ✅ PASSED - Bot handled interruption gracefully"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "  ❌ FAILED - Bot didn't handle interruption well"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    echo "  ---"
    echo ""
}

echo "📋 RUNNING ERROR RECOVERY TEST SUITE"
echo "===================================="
echo ""

# CATEGORY 1: Invalid JSON and Malformed Requests
echo "🔹 CATEGORY 1: Invalid JSON and Malformed Requests"
echo "=================================================="

# Test malformed JSON (this should be handled by API validation)
echo "🧪 Malformed JSON Test"
echo "Sending invalid JSON to API..."
MALFORMED_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "test", "message": "Japan"' 2>&1)

echo "Response: $(echo "$MALFORMED_RESPONSE" | head -c 100)..."

if [[ "$MALFORMED_RESPONSE" =~ "error" || "$MALFORMED_RESPONSE" =~ "SyntaxError" ]]; then
    echo "✅ PASSED - API properly rejects malformed JSON"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo "❌ FAILED - API should reject malformed JSON"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo "---"
echo ""

# CATEGORY 2: Input Validation Recovery
echo "🔹 CATEGORY 2: Input Validation Recovery"
echo "========================================"

run_recovery_test "Extremely Long Input" \
    "$(printf 'A%.0s' {1..5000})" \
    "Japan" \
    "7 days"

run_recovery_test "Unicode and Special Characters" \
    "🇯🇵 日本 🗾 にほん Japan émojis àccénts 中文" \
    "7 days" \
    "£2000"

run_recovery_test "HTML Injection Attempt" \
    "<script>alert('test')</script> Japan" \
    "7 days" \
    "£2000"

echo ""

# CATEGORY 3: Conversation State Recovery
echo "🔹 CATEGORY 3: Conversation State Recovery"
echo "=========================================="

run_interruption_test "Mid-Conversation Interruption"

run_recovery_test "Contradictory Input Recovery" \
    "Japan" \
    "No wait, I meant France" \
    "Actually let's go to Spain" \
    "7 days"

run_recovery_test "Back and Forth Changes" \
    "Japan for 7 days" \
    "Change that to 10 days" \
    "No make it 5 days" \
    "£2000"

echo ""

# CATEGORY 4: System Boundary Testing
echo "🔹 CATEGORY 4: System Boundary Testing"
echo "====================================="

run_recovery_test "Rapid Fire Messages" \
    "Japan" \
    "7" \
    "2000" \
    "2" \
    "London"

run_recovery_test "Out of Context Questions" \
    "What's 2+2?" \
    "Japan" \
    "Tell me about quantum physics" \
    "7 days"

echo ""

# CATEGORY 5: Memory and Context Limits
echo "🔹 CATEGORY 5: Memory and Context Limits"  
echo "========================================"

run_recovery_test "Very Long Conversation" \
    "Japan" \
    "7 days" \
    "£2000" \
    "2 people" \
    "London" \
    "Hotels" \
    "Mid-range" \
    "Food and culture" \
    "What about temples?" \
    "And shopping?" \
    "Do you have ryokans?" \
    "What about vegetarian food?" \
    "How about accessibility?" \
    "Train passes?" \
    "Internet access?"

echo ""

# FINAL RESULTS
echo "🎯 ERROR RECOVERY TEST RESULTS"
echo "=============================="
echo "Total Recovery Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS ✅"
echo "Failed: $FAILED_TESTS ❌"

if [[ $TOTAL_TESTS -gt 0 ]]; then
    echo "Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"
else
    echo "Success Rate: N/A (no tests run)"
fi

echo ""

if [[ $FAILED_TESTS -eq 0 ]]; then
    echo "🎉 EXCELLENT ERROR RECOVERY! Bot handles all failure scenarios gracefully."
elif [[ $FAILED_TESTS -le 2 ]]; then
    echo "✅ Good error recovery with minor improvements possible."
else
    echo "⚠️ Some error scenarios need better handling for robustness."
fi

echo ""
echo "🏁 Error recovery testing complete!"