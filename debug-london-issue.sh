#!/bin/bash

echo "🐛 Debug: London Conversation Issue"
echo "==================================="
echo ""

# Check if server is running
if ! curl -s http://localhost:3000/planner > /dev/null; then
    echo "❌ Server is not running!"
    echo "Please run: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

echo "🔍 DEBUGGING STEPS:"
echo ""
echo "1. Open http://localhost:3000/planner"
echo "2. Open browser Developer Tools (F12)"
echo "3. Go to Console tab"
echo "4. Follow this exact sequence:"
echo ""

echo "Step 1: Type 'i would like to go to Singapore'"
echo "   → Should show Singapore info and ask for dates/departure"
echo ""

echo "Step 2: Type 'london'"
echo "   → Check console for debug info:"
echo "   🔍 Debug info: {"
echo "     userInput: 'london',"
echo "     detectedDestination: 'Singapore',"
echo "     conversationStep: 1,"
echo "     destinationResult: null (should be null since we have Singapore),"
echo "     updatedPlan: {"
echo "       origin: 'London' (should be detected)"
echo "     }"
echo "   }"
echo ""

echo "Expected Bot Response:"
echo "   'Great! Flying from London to Singapore. ✈️"
echo "    When would you like to travel? You can mention specific dates...'"
echo ""

echo "❌ If conversation ends instead:"
echo "   • Check if origin is being detected in console"
echo "   • Check if conversationStep is correct"
echo "   • Check if detectedDestination is preserved"
echo ""

echo "🚀 Opening browser with Developer Tools instructions..."
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000/planner
elif command -v open > /dev/null; then
    open http://localhost:3000/planner
else
    echo "Please manually open: http://localhost:3000/planner"
fi

echo ""
echo "💡 DEBUG TIPS:"
echo "   • F12 to open Developer Tools"
echo "   • Console tab to see debug output"
echo "   • Look for '🔍 Debug info:' messages"
echo "   • Check if origin detection is working"