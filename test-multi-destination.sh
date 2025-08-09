#!/bin/bash

# Multi-Destination and Complex Trip Testing
echo "🗺️ MULTI-DESTINATION & COMPLEX TRIP TESTING"
echo "============================================"
echo "Testing complex trip scenarios, multi-city visits, and advanced requests"
echo ""

API_URL="http://localhost:3000/api/intelligent-conversation"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
declare -a FAILED_TEST_DETAILS=()

# Helper function for multi-destination tests
run_complex_test() {
    local test_name="$1"
    local conversation_id="complex-$(date +%s)-$(echo "$test_name" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
    shift
    local messages=("$@")
    
    echo "🧪 COMPLEX TEST: $test_name"
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
        local destination=$(echo "$response" | jq -r '.conversationContext.tripContext.destination.primary // "none"')
        
        if [[ "$success" != "true" ]]; then
            test_passed=false
            failure_reason="API error at step $step"
            break
        fi
        
        echo "    Bot: $(echo "$bot_response" | head -c 100)..."
        echo "    Destination: $destination"
        
        # Specific validation for complex scenarios
        case "$test_name" in
            "Multi-City Europe")
                if [[ $step == 1 && "$destination" == "none" ]]; then
                    test_passed=false
                    failure_reason="Should extract at least one destination from multi-city request"
                    break
                fi
                ;;
            "Round Trip")
                if [[ $step == 1 && ! "$bot_response" =~ [Jj]apa[n] ]]; then
                    test_passed=false
                    failure_reason="Should acknowledge Japan in round trip request"
                    break
                fi
                ;;
            "Different City Types")
                if [[ $step == 1 && "$destination" == "none" ]]; then
                    test_passed=false
                    failure_reason="Should extract destination from mixed city type request"
                    break
                fi
                ;;
        esac
        
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

# Test complete multi-destination journey
run_full_complex_test() {
    local test_name="$1"
    local conversation_id="full-complex-$(date +%s)"
    shift
    local messages=("$@")
    
    echo "🎯 FULL COMPLEX TEST: $test_name"
    echo "🆔 ID: $conversation_id"
    
    local step=1
    local test_passed=true
    local failure_reason=""
    local got_itinerary=false
    
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
        
        echo "    Bot: $(echo "$bot_response" | head -c 100)..."
        echo "    Intent: $intent"
        
        # Check for itinerary generation
        if [[ "$itinerary" != "null" && "$got_itinerary" == false ]]; then
            echo "    ✅ Complex itinerary generated!"
            got_itinerary=true
        fi
        
        # Final validation
        if [[ $step == ${#messages[@]} && "$message" == "yes" ]]; then
            if [[ "$intent" != "itinerary_completed" ]]; then
                test_passed=false
                failure_reason="Complex trip should complete with itinerary_completed intent"
                break
            fi
            
            if [[ "$got_itinerary" != true ]]; then
                test_passed=false
                failure_reason="Complex trip should generate itinerary"
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
        echo "  ✅ FULL COMPLEX TEST PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "  ❌ FULL COMPLEX TEST FAILED: $failure_reason"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_DETAILS+=("$test_name (Full Complex): $failure_reason")
    fi
    
    echo "  ---"
    echo ""
}

echo "📋 RUNNING COMPLEX TRIP TEST SUITE"
echo "=================================="
echo ""

# CATEGORY 1: Multi-City Requests
echo "🔹 CATEGORY 1: Multi-City Requests"
echo "=================================="

run_complex_test "Multi-City Europe" \
    "I want to visit Paris, Rome, and Barcelona" \
    "10 days" \
    "€4000"

run_complex_test "Asia Tour" \
    "Japan and Thailand trip" \
    "14 days" \
    "$5000"

run_complex_test "UK Cities" \
    "London, Edinburgh, and York" \
    "8 days" \
    "£3500"

echo ""

# CATEGORY 2: Different Trip Types  
echo "🔹 CATEGORY 2: Different Trip Types"
echo "=================================="

run_complex_test "Round Trip" \
    "Round trip to Japan from London" \
    "7 days" \
    "£3000"

run_complex_test "Business Trip" \
    "Business trip to Germany" \
    "3 days" \
    "€1500"

run_complex_test "Honeymoon Trip" \
    "Honeymoon in Italy" \
    "10 days" \
    "€5000"

run_complex_test "Family Vacation" \
    "Family vacation to Spain" \
    "14 days" \
    "€4000" \
    "4 people"

echo ""

# CATEGORY 3: Mixed Destination Types
echo "🔹 CATEGORY 3: Mixed Destination Types"
echo "====================================="

run_complex_test "Different City Types" \
    "Big cities and small towns in France" \
    "12 days" \
    "€3500"

run_complex_test "Cultural and Beach" \
    "Cultural sites and beaches in Greece" \
    "9 days" \
    "€2800"

run_complex_test "Modern and Traditional" \
    "Modern Tokyo and traditional Kyoto" \
    "8 days" \
    "£3200"

echo ""

# CATEGORY 4: Complex Preferences
echo "🔹 CATEGORY 4: Complex Preferences"
echo "================================="

run_complex_test "Food and History" \
    "Japan" \
    "7 days" \
    "£2500" \
    "2" \
    "London" \
    "traditional ryokan and modern hotels" \
    "luxury" \
    "authentic food experiences and ancient temples"

run_complex_test "Adventure and Relaxation" \
    "Thailand" \
    "12 days" \
    "$4000" \
    "2" \
    "New York" \
    "mix of hotels and resorts" \
    "mid-range" \
    "adventure activities and spa relaxation"

echo ""

# CATEGORY 5: Full Complex Journeys
echo "🔹 CATEGORY 5: Full Complex Journeys"
echo "==================================="

run_full_complex_test "European Grand Tour" \
    "France, Italy, and Spain grand tour" \
    "21 days" \
    "€8000" \
    "2" \
    "London Heathrow" \
    "mix of hotels and boutique accommodations" \
    "luxury" \
    "history, art, food, and culture" \
    "yes"

run_full_complex_test "Asian Cultural Journey" \
    "Japan cultural immersion with modern and traditional experiences" \
    "14 days" \
    "£5000" \
    "2" \
    "Manchester" \
    "traditional ryokan and modern hotels" \
    "mid-range" \
    "traditional arts, temples, food culture, and modern technology" \
    "yes"

echo ""

# CATEGORY 6: Special Requests
echo "🔹 CATEGORY 6: Special Requests" 
echo "=============================="

run_complex_test "Dietary Requirements" \
    "Japan" \
    "7 days" \
    "£2500" \
    "2" \
    "London" \
    "hotel" \
    "mid-range" \
    "food and culture but I'm vegetarian"

run_complex_test "Accessibility Needs" \
    "France" \
    "5 days" \
    "€2000" \
    "1" \
    "London" \
    "accessible hotel" \
    "mid-range" \
    "sightseeing with wheelchair accessibility"

echo ""

# FINAL RESULTS
echo "🎯 COMPLEX TRIP TEST RESULTS"
echo "============================"
echo "Total Complex Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS ✅"
echo "Failed: $FAILED_TESTS ❌"

if [[ $TOTAL_TESTS -gt 0 ]]; then
    echo "Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"
else
    echo "Success Rate: N/A (no tests run)"
fi

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
    echo "🎉 ALL COMPLEX SCENARIOS HANDLED! Bot supports advanced trip planning."
elif [[ $FAILED_TESTS -le 3 ]]; then
    echo "✅ Excellent complex trip handling with minor improvements possible."
else
    echo "⚠️ Some complex scenarios need attention for full functionality."
fi

echo ""
echo "🏁 Multi-destination and complex trip testing complete!"