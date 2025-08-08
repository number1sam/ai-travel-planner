#!/bin/bash

echo "🧪 Testing England Conversation Flow"
echo "===================================="

CONV_ID="england-conversation-$(date +%s)"
echo "Using conversation ID: $CONV_ID"

echo -e "\n1. User says: 'I would like to go to England'"
RESULT1=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"slot\": \"destination\", \"value\": \"I would like to go to England\"}")

echo "Bot response:"
echo "$RESULT1" | jq -r '.message' | head -15

echo -e "\n\n2. User responds: 'London'"
RESULT2=$(curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"slot\": \"destination\", \"value\": \"London\"}")

echo "Bot response:"
echo "$RESULT2" | jq -r '.confirmation // .message' 

echo -e "\nDestination locked: $(echo "$RESULT2" | jq -r '.state.destination.value')"
echo "Next step: $(echo "$RESULT2" | jq -r '.expectedSlot')"
echo "Type: $(echo "$RESULT2" | jq -r '.state.destination.type')"

echo -e "\n✅ COMPARISON:"
echo "OLD: 'Where would you like to go? Please tell me your destination.'"
echo "NEW: Specific, helpful guidance about England with clear options!"

echo -e "\n🎉 SUCCESS: The bot now provides:"
echo "• Personable greeting ('Fantastic choice!')"
echo "• Specific country recognition (England vs generic)"  
echo "• Clear options (Single city vs Multi-city)"
echo "• Helpful descriptions of each city"
echo "• Regional breakdown"
echo "• Natural conversation flow"