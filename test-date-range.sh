#\!/bin/bash

echo "=== Testing various date formats ==="

for format in "June 10 to June 20" "10-20 June" "June 10-20" "10th-20th June" "10/6/2025 to 20/6/2025"; do
  CONV_ID="date-test-$(date +%s)"
  
  echo ""
  echo "Testing format: '$format'"
  
  # Setup
  curl -X POST http://localhost:3000/api/rule-based-conversation \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"I want to go to Paris\", \"conversationId\": \"$CONV_ID\"}" \
    2>/dev/null > /dev/null
    
  curl -X POST http://localhost:3000/api/rule-based-conversation \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
    2>/dev/null > /dev/null
  
  # Test date format
  RESULT=$(curl -X POST http://localhost:3000/api/rule-based-conversation \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$format\", \"conversationId\": \"$CONV_ID\"}" \
    2>/dev/null | jq -r '.response')
  
  if [[ "$RESULT" == "What are your dates?" ]]; then
    echo "❌ NOT RECOGNIZED - Bot still asking for dates"
  else
    echo "✅ RECOGNIZED - Bot responded with confirmation"
  fi
done

echo ""
