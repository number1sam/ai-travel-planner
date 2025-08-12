#!/bin/bash

echo "🗣️ Testing Complete Conversation Flow"
echo "====================================="
echo ""

# Check if server is running
if ! curl -s http://localhost:3000/planner > /dev/null; then
    echo "❌ Server is not running!"
    echo "Please run: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

echo "🐛 THE ISSUE WAS:"
echo "   Conversation ending abruptly after user says departure city"
echo "   Example:"
echo "   User: 'i would like to go to Spain'"
echo "   Bot: Shows Spanish cities"
echo "   User: 'Seville'"
echo "   Bot: 'When would you like to travel to Seville? Also, which city will you be departing from?'"
echo "   User: 'London'"
echo "   Bot: [CONVERSATION ENDS] ❌"
echo ""

echo "🔧 THE FIX:"
echo "   1. Enhanced origin city detection to recognize standalone city names"
echo "   2. Improved conversation step 1 logic to handle partial information"
echo "   3. Added intelligent flow control based on what info is provided"
echo ""

echo "🧪 TEST THE COMPLETE FLOW:"
echo ""
echo "Step 1: Type 'i would like to go to Spain'"
echo "        → Bot shows Spanish cities"
echo ""
echo "Step 2: Type 'Seville'"
echo "        → Bot asks for travel dates and departure city"
echo ""
echo "Step 3: Type 'London'"
echo "        → Bot should now say:"
echo "        'Great! Flying from London to Seville. ✈️"
echo "         When would you like to travel? You can mention specific dates...'"
echo ""
echo "Step 4: Type 'June 15-22'"
echo "        → Bot should say:"
echo "        'Excellent! So you're planning to fly from London to Seville around June 15. ✈️"
echo "         How many people will be traveling?'"
echo ""
echo "Step 5: Type '2 people'"
echo "        → Bot should ask about budget"
echo ""
echo "Step 6: Type '£1500'"
echo "        → Bot should ask about interests"
echo ""
echo "Step 7: Continue until bot searches for flights and hotels"
echo ""

echo "✅ EXPECTED BEHAVIOR:"
echo "   • Bot acknowledges each piece of information"
echo "   • Conversation flows smoothly step by step"
echo "   • No abrupt endings"
echo "   • Clear progression through all questions"
echo "   • Final search and travel plan generation"
echo ""

echo "💡 ALTERNATIVE TEST:"
echo "   Try providing multiple pieces of info at once:"
echo "   'I want to go to Paris from London in July for 2 people with £2000 budget'"
echo "   → Bot should extract all info and ask for remaining details"
echo ""

echo "🚀 Opening browser for testing..."
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000/planner
elif command -v open > /dev/null; then
    open http://localhost:3000/planner
else
    echo "Please manually open: http://localhost:3000/planner"
fi

echo ""
echo "🎯 KEY IMPROVEMENTS:"
echo "   • Enhanced city name detection (London, Paris, Madrid, etc.)"
echo "   • Smart conversation flow based on provided information"
echo "   • Better handling of partial responses"
echo "   • Clearer acknowledgment of user input"