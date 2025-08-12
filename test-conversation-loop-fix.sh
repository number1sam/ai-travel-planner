#!/bin/bash

echo "🔧 Testing Conversation Loop Fix"
echo "==============================="
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
echo "   User: 'i would like to go to spain'"
echo "   Bot: Shows Spanish cities list"
echo "   User: 'serville' (typo for Seville)"
echo "   Bot: 'I'd love to help you plan your trip! Could you tell me which destination...'"
echo "   → STUCK IN LOOP asking for destination repeatedly"
echo ""

echo "🔧 THE FIX:"
echo "   1. Added 'serville' as keyword for Seville (typo tolerance)"
echo "   2. Fixed logic condition: destinationResult.type === 'city' (removed !detectedDestination)"
echo "   3. Now handles city selection properly after country selection"
echo ""

echo "🧪 TEST THE FIX:"
echo "1. Open http://localhost:3000/planner"
echo ""
echo "2. Try this exact sequence:"
echo "   Type: 'i would like to go to spain'"
echo "   → Bot should show Spanish cities"
echo "   Type: 'serville'"
echo "   → Bot should recognize it as Seville and continue to next step"
echo ""
echo "3. Expected Result:"
echo "   ✅ Bot recognizes 'serville' as Seville"
echo "   ✅ Shows Seville destination info"
echo "   ✅ Asks: 'When would you like to travel to Seville?'"
echo "   ❌ NO MORE loop asking for destination"
echo ""

echo "4. Also test common typos:"
echo "   'barcelonn' → should work for Barcelona"
echo "   'pariz' → should suggest Paris"
echo "   'madred' → should work for Madrid"
echo ""

echo "Opening browser to test..."
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000/planner
elif command -v open > /dev/null; then
    open http://localhost:3000/planner
else
    echo "Please manually open: http://localhost:3000/planner"
fi