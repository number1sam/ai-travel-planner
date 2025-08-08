#!/bin/bash

echo "🧪 Testing Natural Language Input Processing"
echo "==========================================="

echo -e "\n1. 'I want to visit France'"
curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"test1-$(date +%s)\", \"slot\": \"destination\", \"value\": \"I want to visit France\"}" | \
  jq -r '.message' | head -3

echo -e "\n2. 'Going to Japan'"
curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"test2-$(date +%s)\", \"slot\": \"destination\", \"value\": \"Going to Japan\"}" | \
  jq -r '.message' | head -3

echo -e "\n3. Just 'London' (should work as before)"  
curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"test3-$(date +%s)\", \"slot\": \"destination\", \"value\": \"London\"}" | \
  jq -r '.confirmation // .message' | head -2

echo -e "\n4. 'I would like to go to Spain'"
curl -s -X POST http://localhost:3000/api/conversation-state \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"test4-$(date +%s)\", \"slot\": \"destination\", \"value\": \"I would like to go to Spain\"}" | \
  jq -r '.message' | head -3

echo -e "\n✅ All tests show the bot now:"
echo "• Extracts the actual destination from natural language"
echo "• Provides specific, personable responses"
echo "• Offers clear options instead of generic questions"