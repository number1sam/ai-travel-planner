#!/bin/bash

# Test currency keyword extraction
echo "💰 TESTING CURRENCY KEYWORD EXTRACTION"
echo "======================================"
echo "Testing budget extraction with currency keywords"
echo ""

API_URL="http://localhost:3001/api/intelligent-conversation"

test_currency_keyword() {
    local input="$1"
    local expected_currency="$2"
    local description="$3"
    
    echo "🧪 TESTING: $description"
    local conversation_id="currency-keyword-$(date +%s)-$RANDOM"
    echo "  Input: '$input'"
    echo "  Expected currency: $expected_currency"
    
    local response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"conversationId\": \"$conversation_id\", \"message\": \"$input\"}")
    
    local bot_response=$(echo "$response" | jq -r '.response')
    local extracted_currency=$(echo "$response" | jq -r '.conversationContext.tripContext.budget.currency // "missing"')
    local extracted_amount=$(echo "$response" | jq -r '.conversationContext.tripContext.budget.total // "missing"')
    
    echo "    Bot response: $(echo "$bot_response" | head -c 80)..."
    echo "    Extracted amount: $extracted_amount"
    echo "    Extracted currency: $extracted_currency"
    
    if [[ "$extracted_currency" == "$expected_currency" ]]; then
        echo "    Status: ✅ Currency keyword correctly recognized"
    else
        echo "    Status: ❌ Expected $expected_currency, got $extracted_currency"
    fi
    
    curl -s -X DELETE "$API_URL?conversationId=$conversation_id" > /dev/null
    echo ""
}

# Test various currency keyword formats
test_currency_keyword "Our budget is 5000 dollars" "USD" "Dollars keyword"
test_currency_keyword "We have 3000 pounds to spend" "GBP" "Pounds keyword"
test_currency_keyword "My budget is around 2500 euros" "EUR" "Euros keyword"
test_currency_keyword "I can spend 4000 USD" "USD" "USD code"
test_currency_keyword "Budget of 6000 GBP" "GBP" "GBP code"
test_currency_keyword "Around 1500 EUR total" "EUR" "EUR code"
test_currency_keyword "My budget is 3000" "PENDING" "No currency - should be PENDING"

echo "🏁 Currency keyword testing complete!"