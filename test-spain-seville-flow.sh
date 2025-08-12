#!/bin/bash

echo "🇪🇸 Testing Spain → Seville Conversation Flow"
echo "============================================="
echo ""

# Check if server is running
if ! curl -s http://localhost:3000/planner > /dev/null; then
    echo "❌ Server is not running!"
    echo "Please run: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

echo "🎯 EXACT TEST CASE FROM USER:"
echo ""
echo "1️⃣ User: 'i would like to go to spain'"
echo "   Expected: Bot shows Spanish cities list"
echo ""
echo "2️⃣ User: 'serville'"
echo "   Expected: Bot recognizes as Seville and shows info"
echo ""
echo "3️⃣ Bot should then ask: 'When would you like to travel to Seville?'"
echo "   Expected: NO MORE destination loops"
echo ""

echo "✅ WHAT WE FIXED:"
echo "   • Added 'serville' keyword to Seville detection"
echo "   • Fixed condition logic for city selection after country"
echo "   • Now properly handles country → city selection flow"
echo ""

echo "🧪 TESTING INSTRUCTIONS:"
echo ""
echo "Open the app and try this EXACT sequence:"
echo ""
echo "Step 1: Type 'i would like to go to spain'"
echo "        → Should show: Barcelona, Madrid, Seville, Valencia, Bilbao, Granada"
echo ""
echo "Step 2: Type 'serville'"
echo "        → Should show: Seville destination info"
echo "        → Should ask: 'When would you like to travel to Seville?'"
echo ""
echo "Step 3: Continue conversation normally"
echo "        → Should ask about dates, travelers, budget, etc."
echo ""

echo "❌ WHAT SHOULD NOT HAPPEN:"
echo "   • Bot asking 'Could you tell me which destination...' again"
echo "   • Repeating the same destination question"
echo "   • Getting stuck in a loop"
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
echo "💡 TIP: Try other typos too:"
echo "   • 'barcelonn' for Barcelona"
echo "   • 'madred' for Madrid"
echo "   • 'pariz' for Paris"