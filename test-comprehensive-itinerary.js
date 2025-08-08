// Direct test of the comprehensive itinerary generation
const { multiCityItineraryGenerator } = require('./src/services/MultiCityItineraryGenerator.ts')

async function testComprehensiveItinerary() {
  console.log('🧪 Testing Comprehensive Itinerary Generator Directly\n')
  
  try {
    const testRequest = {
      destinations: ['Dublin', 'Cork'],
      totalDays: 7,
      budget: 2500,
      currency: 'USD',
      travelDates: {
        start: '2024-06-15',
        end: '2024-06-22',
        flexible: false
      },
      travelers: {
        adults: 2,
        children: 0,
        groupType: 'couple'
      },
      preferences: {
        pace: 'moderate',
        transportPreference: 'mixed',
        accommodationStyle: 'mid-range',
        interests: ['cultural', 'food', 'nature'],
        physicalAbility: 'moderate',
        uniqueExperiences: true,
        flexibility: 'moderate'
      },
      constraints: {
        routeType: 'linear'
      }
    }
    
    console.log('🌍 Generating comprehensive itinerary...')
    console.log(`Destinations: ${testRequest.destinations.join(', ')}`)
    console.log(`Duration: ${testRequest.totalDays} days`)
    console.log(`Budget: $${testRequest.budget}`)
    console.log(`Travelers: ${testRequest.travelers.adults} adults`)
    console.log(`Preferences: ${testRequest.preferences.pace} pace, ${testRequest.preferences.accommodationStyle} accommodation`)
    
    const itinerary = await multiCityItineraryGenerator.generateItinerary(testRequest)
    
    console.log('\n🎯 COMPREHENSIVE ITINERARY RESULTS:')
    console.log('=====================================')
    
    console.log('\n📋 OVERVIEW:')
    console.log(`Title: ${itinerary.overview.title}`)
    console.log(`Duration: ${itinerary.overview.duration}`)
    console.log(`Cities: ${itinerary.overview.cities}`)
    console.log(`Total Distance: ${itinerary.overview.totalDistance}km`)
    console.log(`Route Type: ${itinerary.overview.routeType}`)
    
    console.log('\n🗺️ ROUTE OPTIMIZATION:')
    console.log(`Sequence: ${itinerary.route.sequence.join(' → ')}`)
    console.log(`Efficiency Score: ${itinerary.route.efficiency}%`)
    console.log(`Travel Time: ${itinerary.route.estimatedTravelTime} hours`)
    
    console.log('\n✈️ TRANSPORT PLAN:')
    console.log(`Legs: ${itinerary.transport.legs.length}`)
    console.log(`Total Cost: $${itinerary.transport.totalCost.standard}`)
    console.log(`Travel Time: ${itinerary.transport.totalTravelTime} hours`)
    itinerary.transport.legs.forEach((leg, i) => {
      console.log(`  ${i+1}. ${leg.from} → ${leg.to} via ${leg.method} (${leg.duration.total}h, $${leg.cost.standard})`)
    })
    
    console.log('\n🏨 ACCOMMODATION DISTRIBUTION:')
    console.log(`Total Budget: $${itinerary.accommodation.totalBudget}`)
    console.log(`Total Nights: ${itinerary.accommodation.totalNights}`)
    itinerary.accommodation.cities.forEach(city => {
      console.log(`  • ${city.city}: ${city.nights} nights, $${city.budget.total} (${city.hotelType}, ${city.location})`)
    })
    
    console.log('\n🎪 ACTIVITY DISTRIBUTION:')
    console.log(`Total Activities: ${itinerary.activities.totalActivities}`)
    console.log(`Total Cost: $${itinerary.activities.totalCost}`)
    console.log(`Balance Score: ${itinerary.activities.balanceScore}%`)
    console.log(`Variety Score: ${itinerary.activities.varietyScore}%`)
    itinerary.activities.cities.forEach(city => {
      console.log(`  • ${city.city}: ${city.activities.length} activities, ${city.restTime}% rest time`)
      city.activities.slice(0, 2).forEach(activity => {
        console.log(`    - ${activity.activity} (${activity.timeSlot}, $${activity.cost})`)
      })
    })
    
    console.log('\n💰 BUDGET OPTIMIZATION:')
    console.log(`Total Budget: $${itinerary.budget.totalBudget}`)
    console.log('Breakdown:')
    Object.entries(itinerary.budget.globalBreakdown).forEach(([category, amount]) => {
      console.log(`  • ${category}: $${amount}`)
    })
    
    console.log('\n📅 DAILY ITINERARY:')
    itinerary.dailyItinerary.slice(0, 3).forEach(day => {
      console.log(`Day ${day.day} (${day.date}) - ${day.city} [${day.type}]:`)
      if (day.schedule.morning) console.log(`  Morning: ${day.schedule.morning.activity}`)
      if (day.schedule.afternoon) console.log(`  Afternoon: ${day.schedule.afternoon.activity}`)
      if (day.schedule.evening) console.log(`  Evening: ${day.schedule.evening.activity}`)
      console.log(`  Daily Cost: $${day.totalDayCost}`)
    })
    
    console.log('\n📋 BOOKING CHECKLIST:')
    itinerary.bookingChecklist.forEach(item => {
      console.log(`• [${item.priority.toUpperCase()}] ${item.item} by ${item.deadline} ($${item.estimatedCost})`)
    })
    
    console.log('\n🎯 TRAVEL TIPS:')
    console.log('Packing:', itinerary.travelTips.packing[0])
    console.log('Logistics:', itinerary.travelTips.logistics[0])
    console.log('Cultural:', itinerary.travelTips.cultural[0])
    console.log('Budgeting:', itinerary.travelTips.budgeting[0])
    
    console.log('\n📊 METADATA:')
    console.log(`Planning Confidence: ${itinerary.metadata.confidence}%`)
    console.log(`Completeness: ${itinerary.metadata.completeness}%`)
    if (itinerary.metadata.warnings.length > 0) {
      console.log('Warnings:')
      itinerary.metadata.warnings.forEach(w => console.log(`  ⚠️ ${w}`))
    }
    
    console.log('\n✅ Comprehensive itinerary generation test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error(error.stack)
  }
}

testComprehensiveItinerary()