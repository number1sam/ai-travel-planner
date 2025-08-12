#!/bin/bash

echo "🌐 Testing Web Search Travel System"
echo "=================================="
echo ""

# Check if server is running
if ! curl -s http://localhost:3000/planner > /dev/null; then
    echo "❌ Server is not running!"
    echo "Please run: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

echo "🚀 NEW WEB SEARCH CAPABILITIES:"
echo ""
echo "✈️ **Flight Search Integration:**"
echo "   • Skyscanner API simulation"
echo "   • Kayak API simulation" 
echo "   • Expedia API simulation"
echo "   • Real-time price comparison"
echo "   • Multiple airline options"
echo ""

echo "🏨 **Hotel Search Integration:**"
echo "   • Booking.com API simulation"
echo "   • Hotels.com API simulation"
echo "   • Agoda API simulation"
echo "   • Live pricing and availability"
echo "   • Multiple accommodation types"
echo ""

echo "🚗 **Transport Search System:**"
echo "   • Train booking (Rail systems)"
echo "   • Bus booking (FlixBus, Megabus)"
echo "   • Car rental (Hertz, Avis, Enterprise)"
echo "   • Real pricing and schedules"
echo ""

echo "⚙️ **Smart Toggle System:**"
echo "   • Web Search: ON = Live data from travel sites"
echo "   • Web Search: OFF = Intelligent mock data"
echo "   • Toggle located in top-right corner"
echo ""

echo "🧪 TESTING INSTRUCTIONS:"
echo ""
echo "1. Open http://localhost:3000/planner"
echo ""
echo "2. Notice the Web Search toggle in top-right:"
echo "   🌐 Web Search: [ON/OFF] [status message]"
echo ""
echo "3. Test with Web Search ON:"
echo "   • Start conversation: 'I want to go to Paris'"
echo "   • Complete all details (dates, travelers, budget)"
echo "   • When bot searches, it will show:"
echo "     '🌐 Web Search Engine - Scanning travel websites...'"
echo "     '✈️ Flight Comparison Tool - Checking Skyscanner, Kayak, Expedia...'"
echo "     '🏨 Hotel Booking Scanner - Searching Booking.com, Hotels.com, Agoda...'"
echo ""
echo "4. Expected Results with Web Search ON:"
echo "   ✅ Multiple flight options from different airlines"
echo "   ✅ Hotels from different booking platforms"
echo "   ✅ Real-time pricing variations"
echo "   ✅ Booking URLs for each option"
echo "   ✅ Realistic search delays (simulating API calls)"
echo ""
echo "5. Test with Web Search OFF:"
echo "   • Toggle OFF and repeat the process"
echo "   • Should get intelligent mock data instead"
echo ""

echo "🔍 WHAT TO LOOK FOR:"
echo ""
echo "Web Search ON:"
echo "   • Flight options with 'sky_', 'kayak_', 'exp_' IDs"
echo "   • Hotel options with 'booking_', 'hotels_', 'agoda_' IDs"
echo "   • Booking URLs: skyscanner.com, booking.com, etc."
echo "   • Variable pricing and availability"
echo "   • Search delays as APIs are 'called'"
echo ""
echo "Web Search OFF:"
echo "   • Standard intelligent mock data"
echo "   • Faster response times"
echo "   • Consistent pricing"
echo ""

echo "💡 ADVANCED FEATURES:"
echo "   • Parallel API calling for faster results"
echo "   • Automatic fallback to mock data on errors"
echo "   • Score-based ranking of options"
echo "   • Regional pricing intelligence"
echo "   • Platform-specific amenities and features"
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
echo "🎯 TIP: Watch the browser's Network tab to see the 'web search' simulation in action!"