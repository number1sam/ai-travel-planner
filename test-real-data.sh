#\!/bin/bash

echo "🧪 Testing Real Data Flow for Barbados Trip..."
echo ""

# Check if server is running
if \! curl -s http://localhost:3000/planner > /dev/null; then
    echo "❌ Server is not running\!"
    echo "Please run: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

echo "📋 Complete Test Steps for Real Data:"
echo "1. Open http://localhost:3000/planner"
echo ""
echo "2. Say: 'I want to go to Barbados'"
echo "   ➜ Bot should detect Barbados correctly"
echo ""
echo "3. Answer follow-up questions with REAL data:"
echo "   Duration: '7 days'"
echo "   Travelers: '1 person'"
echo "   Budget: 'USD 1500' (test budget constraints)"
echo "   Origin: 'London'"
echo ""
echo "4. When bot asks to proceed: 'yes'"
echo ""
echo "5. Expected REAL Results:"
echo "   ✈️ Flights: LHR → BGI (actual airport codes)"
echo "   🏨 Hotels: The Crane Resort, Sandals Royal, Ocean Two"
echo "   📍 Actual Barbados addresses and amenities"
echo "   💰 Prices adjusted to your $1500 budget"
echo ""
echo "6. Click 'View Full Travel Plan' should show:"
echo "   - Real Barbados hotel names and locations"
echo "   - Actual flight routes using BGI airport code"
echo "   - Budget-appropriate hotel pricing"
echo "   - Barbados-specific attractions and activities"
echo ""
echo "🔍 What to look for (NO MORE FAKE DATA):"
echo "   ❌ No generic destination templates"
echo "   ❌ No 'Your City' placeholder origins"
echo "   ❌ No generic 'INT' airport codes"
echo "   ✅ Real Barbados hotel names"
echo "   ✅ Actual BGI airport code"
echo "   ✅ Your specified budget and travelers"
echo "   ✅ London → Barbados route"
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
