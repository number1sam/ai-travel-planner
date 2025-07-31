# Complete Flow Test for Enhanced Itinerary Generation

## Test Scenario 1: Complete Trip Request
**Input:** "I want to visit Italy with a budget of £2000 for 7 days, just me traveling from London, staying in mid-range hotels"

**Expected Behavior:**
1. ✓ Extracts destination: Italy
2. ✓ Extracts budget: £2000 (not £200)
3. ✓ Extracts duration: 7 days
4. ✓ Extracts travelers: 1 (from "just me")
5. ✓ Extracts departure: London
6. ✓ Extracts accommodation: Mid-range

**Budget Allocation:**
- Accommodation (55%): £1100 (£157/night)
- Activities (30%): £600
- Food (15%): £300

## Test Scenario 2: Conversation Flow
**User:** "I want to go to Italy"
**Bot:** Asks about preferences for Italy

**User:** "I love history, art, and good food"
**Bot:** Acknowledges preferences, asks for budget

**User:** "£2000 and 7 day round trip, two days traveling"
**Bot:** Should capture £2000 (not £200), asks for travelers

**User:** "me"
**Bot:** Should recognize as 1 traveler, asks for departure location

**User:** "London"
**Bot:** Has all data, shows confirmation summary

**User:** "create my itinerary"
**Bot:** Generates full itinerary with:
- Hotel selection (Hotel Artemide or similar)
- 7-day plan with activities
- Budget breakdown displayed

## Test Scenario 3: Itinerary Display
When itinerary is generated, it should show:

### In Chat Response:
- Hotel name, location, price
- Budget breakdown percentages
- Confirmation that itinerary is ready

### In Itinerary Preview (right panel):
- Trip title with destination
- Total cost and travelers
- Each day with:
  - Day number and date
  - Hotel info (if check-in day)
  - Flight info (if travel day)
  - 2-3 activities per day
  - Costs for each item

## Key Fixes Implemented:
1. ✓ Budget regex fixed: `/£(\d+)/gi` captures full amounts
2. ✓ Traveler patterns include `/^\s*me\s*$/i` for just "me"
3. ✓ Completion gate checks all required fields before generation
4. ✓ Enhanced itinerary uses 7-step process with budget allocation
5. ✓ Itinerary display prop mapping fixed to match component interface

## How to Test:
1. Start the app: `npm run dev`
2. Navigate to http://localhost:3001/planner
3. Start chat with one of the test scenarios
4. Verify each step works as expected
5. Confirm itinerary appears in right panel when generated