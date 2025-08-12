#!/bin/bash
echo "Testing travel planner chat functionality..."
echo "Opening browser to test the planner page..."

# Test if the planner page responds
if curl -s http://localhost:3000/planner > /dev/null; then
    echo "✅ Planner page is accessible"
    echo "   Open http://localhost:3000/planner to test the chat"
    echo "   Try saying: 'I want to plan a trip to Paris from London for 2 people with a budget of £2000'"
    echo "   The bot should ask follow-up questions and then search for flights and hotels"
else
    echo "❌ Planner page is not accessible"
fi