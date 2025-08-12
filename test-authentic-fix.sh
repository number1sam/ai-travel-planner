#\!/bin/bash

echo "🔧 Testing Authentic Data Fix"
echo "============================="
echo ""

# Check if server is running
if \! curl -s http://localhost:3000/planner > /dev/null; then
    echo "❌ Server is not running\!"
    exit 1
fi

echo "✅ Server is running"
echo ""

echo "🐛 THE ISSUE WAS:"
echo "   • Bot generated intelligent hotels in chat"
echo "   • But 'View Full Travel Plan' showed generic templates"
echo "   • Travel plan page had its own hardcoded fallbacks"
echo ""

echo "🔧 THE FIX:"
echo "   • Updated travel plan page to use same intelligent generator"
echo "   • Removed '${destination} Grand Hotel' templates"
echo "   • Added region-aware hotel generation"
echo ""

echo "🧪 TEST THE FIX:"
echo "1. Open http://localhost:3000/planner"
echo ""
echo "2. Try: 'I want to go to Prague'"
echo "   Expected in CHAT:"
echo "   ✅ Smart hotels with Prague-specific names"
echo ""
echo "3. Complete the conversation and click 'View Full Travel Plan'"
echo "   Expected in FULL PLAN:"
echo "   ✅ SAME authentic Prague hotels (NOT 'Prague Grand Hotel')"
echo "   ✅ European pricing (~$180 base)"
echo "   ✅ European amenities (Fine Dining, Bar, Historic attractions)"
echo ""

echo "4. Try ANY destination (e.g., 'Kyoto', 'Lagos', 'Reykjavik')"
echo "   Expected:"
echo "   ✅ Chat shows intelligent hotels"
echo "   ✅ Full plan shows SAME intelligent hotels"
echo "   ✅ NO MORE generic '${destination} Grand Hotel'"
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
