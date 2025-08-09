#!/bin/bash

# Edge Case Testing - Complex scenarios and boundary conditions
echo "🔬 EDGE CASE TESTING"
echo "==================="
echo "Testing complex scenarios, boundary conditions, and unusual inputs"
echo ""

API_URL="http://localhost:3000/api/intelligent-conversation"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function for edge case tests
run_edge_test() {
    local test_name="$1"
    local conversation_id="edge-$(date +%s)-$(echo "$test_name" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
    shift
    local messages=("$@")
    
    echo "🧪 EDGE TEST: $test_name"
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
            failure_reason="API error at step $step"
            break
        fi
        
        echo "    Bot: $(echo "$bot_response" | head -c 100)..."
        
        # Special validation for edge cases
        case "$test_name" in
            "Impossible Destination")
                if [[ $step == 1 && ! "$bot_response" =~ "Mars" ]]; then
                    test_passed=false
                    failure_reason="Should acknowledge Mars but provide alternatives"
                fi
                ;;
            "Extremely Long Message")
                if [[ $step == 1 && "$bot_response" == "ERROR" ]]; then
                    test_passed=false
                    failure_reason="Should handle long messages gracefully"
                fi
                ;;
            "Empty Message")
                if [[ $step == 1 && "$bot_response" == "ERROR" ]]; then
                    test_passed=false
                    failure_reason="Should handle empty input gracefully"
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
    fi
    
    echo "  ---"
    echo ""
}

echo "📋 RUNNING EDGE CASE TEST SUITE"
echo "==============================="
echo ""

# CATEGORY 1: Impossible and Invalid Destinations
echo "🔹 CATEGORY 1: Impossible and Invalid Destinations"
echo "=================================================="

run_edge_test "Impossible Destination" \
    "I want to go to Mars"

run_edge_test "Fictional Place" \
    "Let's visit Narnia"

run_edge_test "Nonsense Destination" \
    "Take me to XYZ123ABC"

echo ""

# CATEGORY 2: Extreme Values and Boundary Conditions
echo "🔹 CATEGORY 2: Extreme Values and Boundary Conditions"
echo "====================================================="

run_edge_test "Zero Day Trip" \
    "Japan" \
    "0 days" \
    "£1000"

run_edge_test "Negative Budget" \
    "France" \
    "7 days" \
    "-£500"

run_edge_test "Zero Budget" \
    "Japan" \
    "7 days" \
    "£0"

run_edge_test "Massive Budget" \
    "Japan" \
    "7 days" \
    "£999999"

run_edge_test "Zero Travelers" \
    "Japan" \
    "7 days" \
    "£2000" \
    "0"

run_edge_test "Huge Group" \
    "Japan" \
    "7 days" \
    "£50000" \
    "100 people"

echo ""

# CATEGORY 3: Invalid Input Formats
echo "🔹 CATEGORY 3: Invalid Input Formats"
echo "==================================="

run_edge_test "Empty Message" \
    ""

run_edge_test "Special Characters Only" \
    "@#$%^&*()"

run_edge_test "Numbers Only" \
    "123456789"

run_edge_test "Extremely Long Message" \
    "I want to go to Japan for a very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very long trip with lots and lots and lots and lots and lots of details and information and specifications and requirements and preferences and options and choices"

echo ""

# CATEGORY 4: Mixed and Confused Inputs
echo "🔹 CATEGORY 4: Mixed and Confused Inputs"
echo "========================================"

run_edge_test "Multiple Destinations in One" \
    "I want to visit Japan and France and Spain all together"

run_edge_test "Contradictory Information" \
    "Japan for 7 days but also 14 days with £2000 but also £5000"

run_edge_test "Mixed Languages" \
    "Je veux visiter Japan for siete days with £2000 por favor"

echo ""

# CATEGORY 5: Context Confusion Tests
echo "🔹 CATEGORY 5: Context Confusion Tests"
echo "====================================="

run_edge_test "Sudden Topic Change" \
    "Japan" \
    "What's the weather like?" \
    "7 days"

run_edge_test "Asking Questions Back" \
    "Japan" \
    "What do you think about Japan?" \
    "7 days"

echo ""

# CATEGORY 6: Currency Edge Cases  
echo "🔹 CATEGORY 6: Currency Edge Cases"
echo "=================================="

run_edge_test "Unknown Currency" \
    "Japan" \
    "7 days" \
    "5000 doubloons"

run_edge_test "Multiple Currencies" \
    "Japan" \
    "7 days" \
    "£1000 and $500 and €300"

run_edge_test "Decimal Budget" \
    "Japan" \
    "7 days" \
    "£1500.50"

echo ""

# FINAL RESULTS
echo "🎯 EDGE CASE TEST RESULTS"
echo "========================="
echo "Total Edge Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS ✅"
echo "Failed: $FAILED_TESTS ❌"

if [[ $TOTAL_TESTS -gt 0 ]]; then
    echo "Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"
else
    echo "Success Rate: N/A (no tests run)"
fi

echo ""

if [[ $FAILED_TESTS -eq 0 ]]; then
    echo "🎉 ALL EDGE CASES HANDLED! Bot is extremely robust."
elif [[ $FAILED_TESTS -le 3 ]]; then
    echo "✅ Excellent edge case handling with only minor issues."
else
    echo "⚠️ Some edge cases need attention for improved robustness."
fi

echo ""
echo "🏁 Edge case testing complete!"