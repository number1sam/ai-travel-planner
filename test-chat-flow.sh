#!/bin/bash

echo "🧪 Testing Travel Planner Chat Flow..."
echo ""

# First check if server is running
if ! curl -s http://localhost:3000/planner > /dev/null; then
    echo "❌ Server is not running!"
    echo "Please run: npm run dev"
    exit 1
fi

echo "✅ Server is running on http://localhost:3000"
echo ""

echo "📋 Manual Test Instructions:"
echo "1. Open http://localhost:3000/planner in your browser"
echo "2. Type: 'I want to plan a trip to Paris from London'"
echo "3. Answer the bot's follow-up questions:"
echo "   - Duration: '5 days'"
echo "   - Travelers: '2 people'"
echo "   - Budget: '£2000'"
echo "   - When bot asks if you want to proceed: 'yes'"
echo "4. Watch for the following messages:"
echo "   - 🔍 Activating Flight Finder Tool"
echo "   - 🏨 Launching Hotel Search Tool" 
echo "   - Plan summary with flight and hotel options"
echo "   - 'View Full Travel Plan' button should appear"
echo ""

echo "🔍 Expected Behavior:"
echo "- Bot should find 3 flight options (BA, Ryanair, Lufthansa)"
echo "- Bot should find hotel options in Paris"
echo "- 'View Full Travel Plan' button should show detailed plan"
echo "- No console errors should appear"
echo ""

echo "🐛 If flights/hotels don't work, check browser console for:"
echo "- JavaScript errors"
echo "- Failed network requests"
echo "- Console log messages from search functions"
echo ""

echo "Opening browser..."
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000/planner
elif command -v open > /dev/null; then
    open http://localhost:3000/planner
else
    echo "Please manually open: http://localhost:3000/planner"
fi