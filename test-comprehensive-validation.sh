#!/bin/bash

# Comprehensive system validation
echo "🎯 COMPREHENSIVE SYSTEM VALIDATION"
echo "=================================="
echo "Running all tests to validate the complete system"
echo ""

# Track overall results
TOTAL_TEST_SUITES=0
PASSED_TEST_SUITES=0

run_test_suite() {
    local test_name="$1"
    local test_script="$2"
    local expected_keywords="$3"
    
    echo "📋 RUNNING: $test_name"
    echo "========================================"
    
    TOTAL_TEST_SUITES=$((TOTAL_TEST_SUITES + 1))
    
    if [[ -f "$test_script" ]]; then
        echo "▶️  Executing: $test_script"
        
        # Run test and capture output
        if OUTPUT=$(./"$test_script" 2>&1); then
            echo "$OUTPUT"
            
            # Check for success indicators in output
            if [[ "$expected_keywords" ]]; then
                local keywords_found=true
                IFS=',' read -ra KEYWORDS <<< "$expected_keywords"
                for keyword in "${KEYWORDS[@]}"; do
                    if [[ ! "$OUTPUT" =~ "$keyword" ]]; then
                        keywords_found=false
                        echo "  ❌ Missing expected keyword: $keyword"
                        break
                    fi
                done
                
                if [[ "$keywords_found" == true ]]; then
                    echo "  ✅ $test_name: PASSED"
                    PASSED_TEST_SUITES=$((PASSED_TEST_SUITES + 1))
                else
                    echo "  ❌ $test_name: FAILED - Missing expected indicators"
                fi
            else
                echo "  ✅ $test_name: COMPLETED (manual review required)"
                PASSED_TEST_SUITES=$((PASSED_TEST_SUITES + 1))
            fi
        else
            echo "  ❌ $test_name: FAILED - Script execution error"
            echo "$OUTPUT"
        fi
    else
        echo "  ⚠️  Test script not found: $test_script"
    fi
    
    echo ""
    echo "  ---"
    echo ""
}

# Run all test suites
echo "🚀 Starting comprehensive validation..."
echo ""

# Test 1: State Recovery
run_test_suite "State Recovery" "test-state-recovery.sh" "RECOVERY TEST PASSED,State recovery testing complete"

# Test 2: Multi-city Destination Extraction  
run_test_suite "Multi-City Destinations" "debug-multi-city.js" "France & Italy"

# Test 3: Currency Clarification
run_test_suite "Currency Clarification" "test-currency-clarification.sh" "Currency clarification testing complete,Final Budget: GBP 2500"

# Test 4: Unknown Destinations
run_test_suite "Unknown Destinations" "test-unknown-destinations.sh" "Unknown destination testing complete"

# Test 5: Conversation Flow Improvements
run_test_suite "Flow Fixes" "test-flow-fixes.sh" "Flow fixes testing complete"

# Test 6: Currency Keywords
run_test_suite "Currency Keywords" "test-currency-keywords.sh" "Currency keyword testing complete"

# Test 7: Destination Improvements
run_test_suite "Improved Destinations" "test-improved-destinations.sh" "Improved destination testing complete"

# Final summary
echo ""
echo "🎯 COMPREHENSIVE VALIDATION SUMMARY"
echo "=================================="
echo "Total Test Suites: $TOTAL_TEST_SUITES"
echo "Passed: $PASSED_TEST_SUITES ✅"
echo "Failed: $((TOTAL_TEST_SUITES - PASSED_TEST_SUITES)) ❌"

if [[ $TOTAL_TEST_SUITES -gt 0 ]]; then
    echo "Success Rate: $(( (PASSED_TEST_SUITES * 100) / TOTAL_TEST_SUITES ))%"
fi

echo ""

if [[ $PASSED_TEST_SUITES -eq $TOTAL_TEST_SUITES ]]; then
    echo "🎉 EXCELLENT! All systems validated successfully."
    echo "🚀 The travel agent bot is ready for production!"
    echo ""
    echo "✅ Key improvements implemented:"
    echo "  • State recovery after interruptions"
    echo "  • Multi-city destination extraction"  
    echo "  • Currency clarification for numbers without symbols"
    echo "  • Unknown destination handling"
    echo "  • Conversation flow optimization"
    echo "  • Enhanced budget and origin extraction"
elif [[ $PASSED_TEST_SUITES -gt 0 ]]; then
    echo "✅ Good system status with most validations passing."
    echo "⚠️  Some improvements may be needed for failed tests."
else
    echo "⚠️  System validation shows issues that need attention."
fi

echo ""
echo "🏁 Comprehensive validation complete!"