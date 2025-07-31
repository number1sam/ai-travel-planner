#!/usr/bin/env node

// Test script for the enhanced itinerary generation system

const testCases = [
  {
    name: "Budget parsing test - £2000",
    input: "I want to visit Italy with a budget of £2000 for 7 days",
    expectedBudget: 2000,
    expectedDuration: 7
  },
  {
    name: "Traveler recognition test - 'just me'",
    input: "It's just me traveling",
    expectedTravelers: 1
  },
  {
    name: "Traveler recognition test - '1'",
    input: "1",
    expectedTravelers: 1
  },
  {
    name: "Complete trip request",
    input: "I want to visit Italy with a budget of £2000 for 7 days, just me traveling from London, staying in mid-range hotels",
    expected: {
      destination: "Italy",
      budget: 2000,
      duration: 7,
      travelers: 1,
      departureLocation: "London",
      accommodationType: "Mid-range"
    }
  }
];

// Test budget allocation
function testBudgetAllocation(budget, duration) {
  const perDayBudget = budget / duration;
  const accommodationBudget = Math.round(budget * 0.55);
  const activityBudget = Math.round(budget * 0.30);
  const foodBudget = Math.round(budget * 0.15);
  const pricePerNight = Math.round(accommodationBudget / duration);
  
  console.log(`\nBudget Allocation for £${budget} over ${duration} days:`);
  console.log(`- Per day budget: £${perDayBudget.toFixed(2)}`);
  console.log(`- Accommodation (55%): £${accommodationBudget} (£${pricePerNight}/night)`);
  console.log(`- Activities (30%): £${activityBudget}`);
  console.log(`- Food (15%): £${foodBudget}`);
  console.log(`- Total allocated: £${accommodationBudget + activityBudget + foodBudget}`);
  
  return { accommodationBudget, activityBudget, foodBudget, pricePerNight };
}

// Test regex patterns
function testRegexPatterns() {
  console.log("\n=== Testing Regex Patterns ===");
  
  // Budget patterns
  const budgetPatterns = [
    /£(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    /budget.*?£?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    /£(\d+)/gi
  ];
  
  const budgetTests = [
    "£2000",
    "£200",
    "budget of £2000",
    "£2,000",
    "my budget is £3000"
  ];
  
  console.log("\nBudget Pattern Tests:");
  budgetTests.forEach(test => {
    let found = false;
    for (const pattern of budgetPatterns) {
      pattern.lastIndex = 0; // Reset regex
      const match = pattern.exec(test);
      if (match) {
        console.log(`✓ "${test}" → Captured: £${match[1]}`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`✗ "${test}" → No match found`);
    }
  });
  
  // Traveler patterns
  const travelerPatterns = [
    /\b1\s*,?\s*me\b/i,
    /\bme\s*,?\s*1\b/i,
    /^\s*1\s*,?\s*$/,
    /^\s*me\s*$/i,  // Added pattern for just "me"
    /\bjust\s+me\b/i,
    /\bonly\s+me\b/i,
    /\bmyself\b/i,
    /\bsolo\b/i,
    /\bone\s+person\b/i,
    /\b(\d+)\s*(?:people|persons?|travelers?|adults?)\b/i
  ];
  
  const travelerTests = [
    "1",
    "just me",
    "me",
    "1, me",
    "me, 1",
    "only me",
    "myself",
    "solo",
    "one person",
    "2 people"
  ];
  
  console.log("\nTraveler Pattern Tests:");
  travelerTests.forEach(test => {
    let found = false;
    for (const pattern of travelerPatterns) {
      pattern.lastIndex = 0; // Reset regex
      const match = pattern.exec(test);
      if (match) {
        const count = match[1] ? parseInt(match[1]) : 1;
        console.log(`✓ "${test}" → Travelers: ${count}`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`✗ "${test}" → No match found`);
    }
  });
}

// Test hotel selection
function testHotelSelection(destination, budgetPerNight, people) {
  console.log(`\nFinding hotels in ${destination} for £${budgetPerNight}/night for ${people} ${people === 1 ? 'person' : 'people'}:`);
  
  // Simulate hotel finder logic
  const mockHotels = [
    { name: "Hotel Artemide", pricePerNight: 180, rating: 4.6, distanceFromCenter: 0.8 },
    { name: "Hotel Sonya", pricePerNight: 160, rating: 4.5, distanceFromCenter: 1.2 },
    { name: "Hotel Napoleon", pricePerNight: 145, rating: 4.3, distanceFromCenter: 0.5 },
    { name: "The Westin Excelsior", pricePerNight: 380, rating: 4.8, distanceFromCenter: 0.3 }
  ];
  
  const affordableHotels = mockHotels
    .filter(h => h.pricePerNight <= budgetPerNight * 1.1) // 10% flexibility
    .sort((a, b) => {
      // Sort by rating first, then by distance
      if (Math.abs(a.rating - b.rating) > 0.2) {
        return b.rating - a.rating;
      }
      return a.distanceFromCenter - b.distanceFromCenter;
    });
  
  if (affordableHotels.length > 0) {
    const selected = affordableHotels[0];
    console.log(`✓ Selected: ${selected.name} (${selected.rating}⭐, £${selected.pricePerNight}/night, ${selected.distanceFromCenter}km from center)`);
  } else {
    console.log(`✗ No hotels found within budget`);
  }
}

// Run all tests
console.log("=== Travel Agent Itinerary System Test ===");

testRegexPatterns();

// Test budget allocations
console.log("\n=== Testing Budget Allocations ===");
testBudgetAllocation(2000, 7);
testBudgetAllocation(3000, 10);
testBudgetAllocation(1500, 5);

// Test hotel selection
console.log("\n=== Testing Hotel Selection ===");
testHotelSelection("Italy", 157, 1); // £2000 * 0.55 / 7 days
testHotelSelection("Italy", 165, 2); // £3000 * 0.55 / 10 days

console.log("\n=== Tests Complete ===");