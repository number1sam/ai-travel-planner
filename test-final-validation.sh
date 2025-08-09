#!/bin/bash

# Final comprehensive system validation
echo "🎯 FINAL SYSTEM VALIDATION"
echo "=========================="
echo "Final validation of all Phase 3 improvements"
echo ""

# Quick validation of all key features
TOTAL_TESTS=0
PASSED_TESTS=0

run_quick_test() {
    local test_name="$1"
    local expected_result="$2"
    
    echo "🧪 Testing: $test_name"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Run the test based on type
    case "$test_name" in
        "State Recovery")
            if ./test-state-recovery.sh | grep -q "RECOVERY TEST PASSED"; then
                echo "  ✅ PASSED"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                echo "  ❌ FAILED"
            fi
            ;;
        "Multi-City Extraction")
            if node debug-multi-city.js | grep -q "France & Italy"; then
                echo "  ✅ PASSED"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                echo "  ❌ FAILED"
            fi
            ;;
        "Currency Clarification")
            if ./test-currency-clarification.sh | grep -q "Final Budget: GBP 2500"; then
                echo "  ✅ PASSED"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                echo "  ❌ FAILED"
            fi
            ;;
        "Unknown Destinations")
            if ./test-unknown-destinations.sh | grep -q "Recognized as: Portugal"; then
                echo "  ✅ PASSED"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                echo "  ❌ FAILED"
            fi
            ;;
        "Flow Optimization")
            if ./test-flow-fixes.sh | grep -q "Honeymoon parsing fixed"; then
                echo "  ✅ PASSED"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                echo "  ❌ FAILED"  
            fi
            ;;
    esac
    
    sleep 0.5
}

echo "🚀 Running quick validation of all Phase 3 improvements..."
echo ""

run_quick_test "State Recovery" "RECOVERY TEST PASSED"
run_quick_test "Multi-City Extraction" "France & Italy"  
run_quick_test "Currency Clarification" "Final Budget: GBP 2500"
run_quick_test "Unknown Destinations" "Recognized as: Portugal"
run_quick_test "Flow Optimization" "Honeymoon parsing fixed"

echo ""
echo "🎯 FINAL VALIDATION RESULTS"
echo "=========================="
echo "Phase 3 Improvements Tested: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS ✅"
echo "Failed: $((TOTAL_TESTS - PASSED_TESTS)) ❌"

if [[ $TOTAL_TESTS -gt 0 ]]; then
    echo "Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"
fi

echo ""

if [[ $PASSED_TESTS -eq $TOTAL_TESTS ]]; then
    echo "🎉 PHASE 3 COMPLETE! All improvements validated successfully!"
    echo ""
    echo "✅ **Phase 3 Achievements:**"
    echo "  1. ✅ Fixed itinerary generation trigger after state recovery"
    echo "  2. ✅ Enhanced multi-city destination extraction" 
    echo "  3. ✅ Fixed currency clarification for numbers without symbols"
    echo "  4. ✅ Improved unknown destination handling"
    echo "  5. ✅ Added conversation flow optimization"
    echo ""
    echo "🚀 **System Status:** Production Ready"
    echo "📈 **Reliability:** High - All critical flows validated"
    echo "🎯 **User Experience:** Significantly improved"
elif [[ $PASSED_TESTS -gt $((TOTAL_TESTS * 3 / 4)) ]]; then
    echo "✅ Phase 3 improvements mostly successful!"
    echo "⚠️  Minor issues may need attention for perfect reliability."
else
    echo "⚠️  Phase 3 needs additional work to meet quality standards."
fi

echo ""
echo "🏁 Final validation complete!"