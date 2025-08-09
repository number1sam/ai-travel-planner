#!/bin/bash

# Comprehensive conversation flow testing
# Tests all major user journeys, edge cases, and conversation scenarios

echo "🔍 COMPREHENSIVE CONVERSATION FLOW TESTING"
echo "==========================================="
echo "Testing all conversation paths, edge cases, and user scenarios"
echo ""

API_URL="http://localhost:3000/api/intelligent-conversation"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test result tracking
declare -a FAILED_TEST_DETAILS=()

# Helper function to run a conversation test
run_test() {
    local test_name="$1"
    local conversation_id="test-$(date +%s)-$(echo "$test_name" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
    shift
    local messages=("$@")
    
    echo "🧪 TEST: $test_name"
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
            test_passed=false
            failure_reason="API error at step $step: $bot_response"
            break
        fi
        
        echo "    Bot: $(echo "$bot_response" | head -c 80)..."
        
        # Specific validations per step
        case $step in
            1) # First message should acknowledge destination
                if [[ ! "$bot_response" =~ [Jj]apa[n] && ! "$bot_response" =~ [Ff]ranc[e] && ! "$bot_response" =~ [Ee]nglan[d] ]]; then
                    test_passed=false  
                    failure_reason="Step 1: Bot didn't acknowledge destination"
                fi
                ;;
            2) # Duration should be processed
                if [[ "$message" =~ day && ! "$bot_response" =~ budget ]]; then
                    test_passed=false
                    failure_reason="Step 2: Duration not processed, didn't ask for budget"
                fi
                ;;
            3) # Budget should be processed  
                if [[ "$message" =~ £ && ! "$bot_response" =~ [Pp]eople|[Tt]ravel ]]; then
                    test_passed=false
                    failure_reason="Step 3: Budget not processed, didn't ask about travelers"
                fi
                ;;
        esac
        
        if [[ "$test_passed" == false ]]; then
            break
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
        FAILED_TEST_DETAILS+=("$test_name: $failure_reason")
    fi
    
    echo "  ---"
    echo ""
}

# Test scenario for complete successful flow
run_complete_flow_test() {
    local test_name="$1"
    local conversation_id="complete-$(date +%s)"
    shift
    local messages=("$@")
    
    echo "🎯 COMPLETE FLOW TEST: $test_name"
    echo "🆔 ID: $conversation_id"
    
    local step=1
    local test_passed=true
    local failure_reason=""
    local itinerary_generated=false
    
    for message in "${messages[@]}"; do
        echo "  Step $step: \"$message\""
        
        local response=$(curl -s -X POST "$API_URL" \
          -H "Content-Type: application/json" \
          -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$message\"}")
        
        local bot_response=$(echo "$response" | jq -r '.response // "ERROR"')
        local success=$(echo "$response" | jq -r '.success // false')
        local itinerary=$(echo "$response" | jq -r '.itinerary // null')
        local intent=$(echo "$response" | jq -r '.conversationContext.tripContext.currentIntent // "none"')
        
        if [[ "$success" != "true" ]]; then
            test_passed=false
            failure_reason="API error at step $step"
            break
        fi
        
        echo "    Bot: $(echo "$bot_response" | head -c 80)..."
        echo "    Intent: $intent"
        
        # Check for itinerary generation
        if [[ "$itinerary" != "null" && "$itinerary_generated" == false ]]; then
            echo "    ✅ Itinerary generated!"
            itinerary_generated=true
            
            # Validate itinerary has real data
            local hotel_name=$(echo "$itinerary" | jq -r '.hotel.name // "not found"')
            if [[ "$hotel_name" == *"Central Hotel"* ]]; then
                test_passed=false
                failure_reason="Generated itinerary still has placeholder hotel data"
                break
            fi
        fi
        
        # Final step validation
        if [[ $step == ${#messages[@]} ]]; then
            if [[ "$message" == "yes" && "$intent" != "itinerary_completed" ]]; then
                test_passed=false
                failure_reason="Final step: Intent should be 'itinerary_completed' but was '$intent'"
                break
            fi
            
            if [[ "$message" == "yes" && "$itinerary_generated" != true ]]; then
                test_passed=false  
                failure_reason="Final step: Itinerary should be generated but wasn't"
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
        echo "  ✅ COMPLETE FLOW PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "  ❌ COMPLETE FLOW FAILED: $failure_reason"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_DETAILS+=("$test_name (Complete Flow): $failure_reason")
    fi
    
    echo "  ---"
    echo ""
}

echo "📋 RUNNING COMPREHENSIVE TEST SUITE"
echo "===================================="
echo ""

# TEST CATEGORY 1: Basic conversation flows
echo "🔹 CATEGORY 1: Basic Conversation Flows"
echo "========================================"

run_test "Simple Japan Trip" \
    "I want to go to Japan" \
    "7 days" \
    "£2000"

run_test "France Trip with Details" \
    "France for vacation" \
    "10 days" \
    "€3000"

run_test "England Small Towns" \
    "Small charming towns in England" \
    "5 days" \
    "$2500"

echo ""

# TEST CATEGORY 2: Alternative input formats  
echo "🔹 CATEGORY 2: Alternative Input Formats"
echo "========================================"

run_test "Casual Language" \
    "i wanna visit japan lol" \
    "like a week maybe" \
    "i got 2k pounds"

run_test "Written Numbers" \
    "Japan" \
    "two weeks" \
    "three thousand pounds"

run_test "Airport Codes" \
    "Japan" \
    "14 days" \
    "£3000" \
    "2" \
    "LHR"

echo ""

# TEST CATEGORY 3: Complete end-to-end flows
echo "🔹 CATEGORY 3: Complete End-to-End Flows"  
echo "========================================"

run_complete_flow_test "Full Japan Journey" \
    "Japan" \
    "7 days" \
    "£2500" \
    "2" \
    "London Heathrow" \
    "hotel" \
    "mid-range" \
    "food and culture" \
    "yes"

run_complete_flow_test "Full France Journey" \
    "France" \
    "5 days" \
    "€2000" \
    "4" \
    "Manchester" \
    "hotel" \
    "luxury" \
    "history and art" \
    "yes"

echo ""

# TEST CATEGORY 4: Edge cases and error conditions
echo "🔹 CATEGORY 4: Edge Cases and Error Handling"
echo "==========================================="

run_test "Very Long Trip" \
    "Japan" \
    "30 days" \
    "£10000"

run_test "Very Short Trip" \
    "France" \
    "1 day" \
    "€500"

run_test "Large Group" \
    "Japan" \
    "7 days" \
    "£15000" \
    "10 people"

run_test "Unknown Destination" \
    "I want to go to Mars" \
    "7 days" \
    "£2000"

echo ""

# TEST CATEGORY 5: Currency handling
echo "🔹 CATEGORY 5: Currency and Budget Variations"
echo "============================================="

run_test "No Currency Symbol" \
    "Japan" \
    "7 days" \
    "2500"

run_test "Dollar Currency" \
    "Japan" \
    "7 days" \
    "$3000"

run_test "Euro Currency" \
    "France" \
    "7 days" \
    "€2500"

echo ""

# FINAL RESULTS
echo "🎯 TEST RESULTS SUMMARY"
echo "======================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS ✅"
echo "Failed: $FAILED_TESTS ❌"
echo "Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"
echo ""

if [[ $FAILED_TESTS -gt 0 ]]; then
    echo "❌ FAILED TESTS DETAILS:"
    echo "========================"
    for failure in "${FAILED_TEST_DETAILS[@]}"; do
        echo "- $failure"
    done
    echo ""
fi

if [[ $FAILED_TESTS -eq 0 ]]; then
    echo "🎉 ALL TESTS PASSED! Bot conversation flows are working perfectly."
elif [[ $FAILED_TESTS -le 2 ]]; then
    echo "✅ Mostly successful with minor issues to address."
else
    echo "⚠️ Multiple test failures - conversation flows need attention."
fi

echo ""
echo "🏁 Comprehensive conversation flow testing complete!"