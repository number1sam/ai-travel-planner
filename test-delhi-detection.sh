#\!/bin/bash

echo "🧪 Testing Delhi Detection Fix..."
echo ""

# Check if server is running
if \! curl -s http://localhost:3000/planner > /dev/null; then
    echo "❌ Server is not running\!"
    echo "Please run: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

echo "📋 Test Steps for Delhi Detection:"
echo "1. Open http://localhost:3000/planner"
echo ""
echo "2. Test these phrases:"
echo "   'I want to go to Delhi'"
echo "   'Delhi'"
echo "   'I would like to visit India'"
echo "   → 'Delhi' (from the suggested cities)"
echo ""
echo "3. Expected Results:"
echo "   ✅ 'Delhi' should be recognized immediately"
echo "   ✅ Bot should ask for duration, travelers, budget"
echo "   ✅ Should show Delhi-specific hotels:"
echo "      - The Imperial New Delhi"
echo "      - Hotel Metropolis"
echo "      - FabHotel Prime Karol Bagh"
echo "   ✅ Airport code should be DEL"
echo "   ❌ No more 'I'd love to help you plan' loop"
echo ""

echo "🔍 What Was Fixed:"
echo "   - Added Delhi to city detection database"
echo "   - Added DEL airport code"
echo "   - Added 3 real Delhi hotels with Indian addresses"
echo "   - Added Mumbai, Goa, Bangalore, Chennai, and other major Indian cities"
echo ""

echo "Opening browser..."
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000/planner
elif command -v open > /dev/null; then
    open http://localhost:3000/planner
else
    echo "Please manually open: http://localhost:3000/planner"
fi
EOF < /dev/null
