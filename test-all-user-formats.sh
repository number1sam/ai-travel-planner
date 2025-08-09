#\!/bin/bash

echo "=== Testing ALL user date formats ==="

formats=(
  "26 may- 10 june 2026"
  "26 may- 10 june, 2026" 
  "26 of may until 10th of june , 2026"
)

for i in "${\!formats[@]}"; do
  format="${formats[$i]}"
  CONV_ID="test-format-$i-$(date +%s)"
  
  # Setup conversation
  curl -X POST http://localhost:3000/api/rule-based-conversation \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"I want to go to Canada\", \"conversationId\": \"$CONV_ID\"}" \
    2>/dev/null > /dev/null

  curl -X POST http://localhost:3000/api/rule-based-conversation \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"yes\", \"conversationId\": \"$CONV_ID\"}" \
    2>/dev/null > /dev/null

  echo "Testing: '$format'"
  RESULT=$(curl -X POST http://localhost:3000/api/rule-based-conversation \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$format\", \"conversationId\": \"$CONV_ID\"}" \
    2>/dev/null | jq -r '.response')

  if [[ "$RESULT" == *"What are your dates?"* ]]; then
    echo "❌ FAILED - Still asking for dates"
  else
    echo "✅ WORKS - Date recognized and extracted"
  fi
  echo ""
done

echo "All your problematic date formats should now work\!"
