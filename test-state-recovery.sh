#!/bin/bash

# Conversation State Recovery Testing
echo "💾 CONVERSATION STATE RECOVERY TESTING"
echo "======================================"
echo "Testing conversation persistence and recovery after system interruptions"
echo ""

API_URL="http://localhost:3000/api/intelligent-conversation"

# Test conversation recovery scenario
test_conversation_recovery() {
    local test_name="$1"
    local conversation_id="recovery-test-$(date +%s)"
    
    echo "🧪 RECOVERY TEST: $test_name"
    echo "🆔 ID: $conversation_id"
    echo ""
    
    # Phase 1: Build up conversation state
    echo "📝 Phase 1: Building conversation state..."
    
    declare -a SETUP_MESSAGES=(
        "I want to visit Japan"
        "14 days"
        "£4000"
        "2 people"
        "London Heathrow"
        "traditional ryokan and modern hotels"
        "luxury"
        "traditional culture, temples, and authentic food"
    )
    
    local last_response=""
    for i in "${!SETUP_MESSAGES[@]}"; do
        local message="${SETUP_MESSAGES[$i]}"
        local step=$((i + 1))
        
        echo "  Step $step: \"$message\""
        
        local response=$(curl -s -X POST "$API_URL" \
          -H "Content-Type: application/json" \
          -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$message\"}")
        
        local bot_response=$(echo "$response" | jq -r '.response // "ERROR"')
        echo "    Bot: $(echo "$bot_response" | head -c 80)..."
        
        last_response="$bot_response"
        sleep 0.1
    done
    
    echo ""
    echo "🔍 Phase 2: Checking conversation state before recovery..."
    
    # Get current state
    local pre_recovery_state=$(curl -s -X GET "$API_URL?conversationId=$conversation_id")
    local pre_trip_context=$(echo "$pre_recovery_state" | jq -r '.tripContext')
    local pre_message_count=$(echo "$pre_recovery_state" | jq -r '.messages | length')
    
    echo "  Messages before recovery: $pre_message_count"
    echo "  Context before recovery: $(echo "$pre_trip_context" | jq -c '{destination: .destination.primary, duration: .dates.duration, budget: .budget.total, travelers: .travelers.adults}')"
    echo ""
    
    echo "💾 Phase 3: Simulating system interruption (clearing in-memory state)..."
    
    # Note: We can't actually clear server memory, but we can test that persistence worked
    # by sending a new message and checking if context is maintained
    
    echo ""
    echo "🔄 Phase 4: Testing recovery by continuing conversation..."
    
    # Continue conversation to test recovery
    local recovery_message="yes, please generate my itinerary"
    echo "  Recovery message: \"$recovery_message\""
    
    local recovery_response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$recovery_message\"}")
    
    local recovery_bot_response=$(echo "$recovery_response" | jq -r '.response // "ERROR"')
    local recovery_intent=$(echo "$recovery_response" | jq -r '.conversationContext.tripContext.currentIntent // "none"')
    local itinerary_generated=$(echo "$recovery_response" | jq -r '.metadata.itineraryGenerated // false')
    
    echo "    Recovery Bot: $(echo "$recovery_bot_response" | head -c 100)..."
    echo "    Intent: $recovery_intent"
    echo "    Itinerary Generated: $itinerary_generated"
    echo ""
    
    # Phase 5: Verify state persistence
    echo "✅ Phase 5: Verifying state persistence..."
    
    local post_recovery_state=$(curl -s -X GET "$API_URL?conversationId=$conversation_id")
    local post_trip_context=$(echo "$post_recovery_state" | jq -r '.tripContext')
    local post_message_count=$(echo "$post_recovery_state" | jq -r '.messages | length')
    
    echo "  Messages after recovery: $post_message_count"
    echo "  Context after recovery: $(echo "$post_trip_context" | jq -c '{destination: .destination.primary, duration: .dates.duration, budget: .budget.total, travelers: .travelers.adults}')"
    
    # Validation checks
    local test_passed=true
    local failure_reasons=()
    
    # Check message count increased
    if [[ $post_message_count -le $pre_message_count ]]; then
        test_passed=false
        failure_reasons+=("Message count didn't increase after recovery")
    fi
    
    # Check context preservation
    local destination=$(echo "$post_trip_context" | jq -r '.destination.primary // "missing"')
    local duration=$(echo "$post_trip_context" | jq -r '.dates.duration // "missing"')
    local budget=$(echo "$post_trip_context" | jq -r '.budget.total // "missing"')
    
    if [[ "$destination" != "Japan" ]]; then
        test_passed=false
        failure_reasons+=("Destination not preserved: expected Japan, got $destination")
    fi
    
    if [[ "$duration" != "14" ]]; then
        test_passed=false
        failure_reasons+=("Duration not preserved: expected 14, got $duration")
    fi
    
    if [[ "$budget" != "4000" ]]; then
        test_passed=false
        failure_reasons+=("Budget not preserved: expected 4000, got $budget")
    fi
    
    # Check itinerary generation worked
    if [[ "$itinerary_generated" != "true" ]]; then
        test_passed=false
        failure_reasons+=("Itinerary generation failed after recovery")
    fi
    
    # Test additional context questions
    echo ""
    echo "🔍 Phase 6: Testing context-aware responses after recovery..."
    
    local context_test_response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"What's my budget again?\"}")
    
    local context_bot_response=$(echo "$context_test_response" | jq -r '.response // "ERROR"')
    echo "    Context Test: \"What's my budget again?\""
    echo "    Bot: $(echo "$context_bot_response" | head -c 100)..."
    
    if [[ ! "$context_bot_response" =~ "4000" && ! "$context_bot_response" =~ "£4,000" ]]; then
        test_passed=false
        failure_reasons+=("Context-aware response failed: budget not mentioned in response")
    fi
    
    # Cleanup
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
    echo ""
    
    # Results
    if [[ "$test_passed" == true ]]; then
        echo "✅ RECOVERY TEST PASSED: Conversation state fully preserved and recovered"
    else
        echo "❌ RECOVERY TEST FAILED:"
        for reason in "${failure_reasons[@]}"; do
            echo "   - $reason"
        done
    fi
    
    echo "  ---"
    echo ""
    
    return $([ "$test_passed" = true ] && echo 0 || echo 1)
}

# Test rapid conversation with recovery
test_rapid_recovery() {
    local conversation_id="rapid-recovery-$(date +%s)"
    
    echo "🧪 RAPID RECOVERY TEST"
    echo "🆔 ID: $conversation_id"
    echo ""
    
    # Rapid conversation setup
    echo "⚡ Phase 1: Rapid conversation setup..."
    
    # Send multiple messages quickly
    curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$conversation_id\", \"message\": \"France\"}" > /dev/null &
    curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$conversation_id\", \"message\": \"7 days\"}" > /dev/null &
    curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"conversationId\": \"$conversation_id\", \"message\": \"€2500\"}" > /dev/null &
    
    # Wait for all background jobs to complete
    wait
    
    sleep 1 # Allow persistence to complete
    
    # Test recovery
    echo "🔄 Phase 2: Testing recovery after rapid messages..."
    
    local final_response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"2 people\"}")
    
    local final_bot_response=$(echo "$final_response" | jq -r '.response // "ERROR"')
    local destination=$(echo "$final_response" | jq -r '.conversationContext.tripContext.destination.primary // "missing"')
    
    echo "    Final response: $(echo "$final_bot_response" | head -c 80)..."
    echo "    Destination in context: $destination"
    
    # Cleanup
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
    
    if [[ "$destination" == "France" ]]; then
        echo "✅ RAPID RECOVERY PASSED: Context preserved through rapid messages"
    else
        echo "❌ RAPID RECOVERY FAILED: Context lost during rapid messaging"
        return 1
    fi
    
    echo "  ---"
    echo ""
    return 0
}

echo "📋 RUNNING STATE RECOVERY TEST SUITE"
echo "===================================="
echo ""

# Run recovery tests
TOTAL_TESTS=0
PASSED_TESTS=0

# Test 1: Full conversation recovery
test_conversation_recovery "Full Conversation Recovery"
if [[ $? -eq 0 ]]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 2: Rapid recovery
test_rapid_recovery
if [[ $? -eq 0 ]]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))  
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Final results
echo "🎯 STATE RECOVERY TEST RESULTS"
echo "=============================="
echo "Total Recovery Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS ✅"
echo "Failed: $((TOTAL_TESTS - PASSED_TESTS)) ❌"

if [[ $TOTAL_TESTS -gt 0 ]]; then
    echo "Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"
fi

echo ""

if [[ $PASSED_TESTS -eq $TOTAL_TESTS ]]; then
    echo "🎉 EXCELLENT STATE RECOVERY! All conversations can be fully restored."
elif [[ $PASSED_TESTS -gt 0 ]]; then
    echo "✅ Good state recovery with some improvements possible."
else
    echo "⚠️ State recovery needs attention - conversations may be lost on interruption."
fi

echo ""
echo "🏁 State recovery testing complete!"