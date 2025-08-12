#!/bin/bash

echo "🌍 Testing Unknown/Any Destination Acceptance"
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

echo "🐛 THE ISSUE WAS:"
echo "   Bot only accepted predefined countries/cities from its database"
echo "   Any unknown destination → 'I'd love to help you plan your trip! Could you tell me which destination...'"
echo "   Users couldn't plan trips to lesser-known places"
echo ""

echo "🔧 THE FIX:"
echo "   1. Enhanced destination detection with fallback extraction"
echo "   2. Parses any reasonable place name from user input"
echo "   3. Removes travel phrases and extracts potential destinations"
echo "   4. Accepts any capitalized word/phrase that looks like a place"
echo ""

echo "🧪 TEST THESE UNKNOWN DESTINATIONS:"
echo ""

echo "1️⃣ Test: 'I want to go to Bhutan'"
echo "   Expected: 'Great choice! Bhutan is a wonderful destination. Let me help you plan your trip there.'"
echo "   Expected: Asks for dates and departure city"
echo ""

echo "2️⃣ Test: 'I would like to visit Nepal'"
echo "   Expected: 'Great choice! Nepal is a wonderful destination...'"
echo ""

echo "3️⃣ Test: 'Planning a trip to Mongolia'"
echo "   Expected: 'Great choice! Mongolia is a wonderful destination...'"
echo ""

echo "4️⃣ Test: 'I want to go to Sri Lanka'"
echo "   Expected: 'Great choice! Sri Lanka is a wonderful destination...'"
echo ""

echo "5️⃣ Test: 'Visit Myanmar'"
echo "   Expected: 'Great choice! Myanmar is a wonderful destination...'"
echo ""

echo "6️⃣ Test: 'Go to Madagascar'"
echo "   Expected: 'Great choice! Madagascar is a wonderful destination...'"
echo ""

echo "7️⃣ Test: 'Trip to New Zealand'"
echo "   Expected: 'Great choice! New Zealand is a wonderful destination...'"
echo ""

echo "8️⃣ Test: 'I want to travel to Kazakhstan'"
echo "   Expected: 'Great choice! Kazakhstan is a wonderful destination...'"
echo ""

echo "✅ EXPECTED BEHAVIOR FOR ALL:"
echo "   • Bot accepts ANY destination name"
echo "   • Shows generic but positive response for unknown places"
echo "   • Continues with normal conversation flow"
echo "   • Asks for dates, travelers, budget, etc."
echo "   • Generates travel plan using intelligent fallback data"
echo ""

echo "❌ SHOULD NOT HAPPEN:"
echo "   • 'I'd love to help you plan your trip! Could you tell me which destination...'"
echo "   • Rejecting valid country/city names"
echo "   • Requiring exact matches from predefined list"
echo ""

echo "🎯 ADVANCED PARSING:"
echo "   • Removes: 'I want to', 'planning to', 'trip to', etc."
echo "   • Extracts: Capitalized words that look like places"
echo "   • Handles: Multi-word destinations (New Zealand, Sri Lanka)"
echo "   • Filters: Common non-destination words (trip, vacation, etc.)"
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
echo "💡 TEST STRATEGY:"
echo "   1. Try the unknown destinations listed above"
echo "   2. Try made-up place names like 'Atlantis' or 'Wonderland'"
echo "   3. Complete full conversation to travel plan generation"
echo "   4. Verify intelligent fallback data is used for unknown places"