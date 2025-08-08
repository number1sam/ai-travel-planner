// Comprehensive Multi-City Planning System Test
// Tests the complete end-to-end multi-city itinerary generation

const apiUrl = 'http://localhost:3000/api/conversation-state'

async function testMultiCityPlanning() {
  console.log('🧪 Testing Comprehensive Multi-City Planning System\n')

  try {
    // Test 1: Ireland Multi-City Tour
    console.log('=== Test 1: Ireland Multi-City Tour ===')
    
    const conversationId = 'multi-city-test-' + Date.now()
    
    // Step 1: Initialize destination
    let response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        slot: 'destination',
        value: 'Dublin and Cork'
      })
    })
    
    let result = await response.json()
    console.log('Step 1 - Destination Detection:', result.confirmation)
    console.log('Next slot:', result.nextSlot)
    console.log('Multi-city detected:', result.state?.destination?.tripScope?.scope)
    
    if (result.nextSlot === 'destination-scope') {
      // Step 2: Choose scope
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          slot: 'destination-scope',
          value: 'classic route'
        })
      })
      
      result = await response.json()
      console.log('Step 2 - Scope Selection:', result.confirmation)
      console.log('Next slot:', result.nextSlot)
    }
    
    if (result.nextSlot === 'route-confirmation') {
      // Step 3: Add travel details first
      console.log('\n--- Adding Travel Details ---')
      
      // Add dates
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          slot: 'dates',
          value: 'June 15 for 7 days'
        })
      })
      
      // Add budget
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          slot: 'budget',
          value: '2500'
        })
      })
      
      // Add people
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          slot: 'people',
          value: '2'
        })
      })
      
      console.log('✅ Travel details added (dates, budget, people)')
      
      // Step 4: Confirm route (this should trigger comprehensive planning)
      console.log('\n--- Confirming Route & Generating Comprehensive Itinerary ---')
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          slot: 'route-confirmation',
          value: 'yes, create this plan'
        })
      })
      
      result = await response.json()
      console.log('\nStep 3 - Route Confirmation with Comprehensive Planning:')
      console.log(result.confirmation)
      console.log('\nNext slot:', result.nextSlot)
      
      // Check if comprehensive itinerary was generated
      if (result.state?.multiCityPlan?.comprehensiveItinerary) {
        const itinerary = result.state.multiCityPlan.comprehensiveItinerary
        console.log('\n🎯 COMPREHENSIVE ITINERARY GENERATED!')
        console.log('===================================')
        console.log(`Title: ${itinerary.overview.title}`)
        console.log(`Duration: ${itinerary.overview.duration}`)
        console.log(`Cities: ${itinerary.overview.cities}`)
        console.log(`Total Distance: ${itinerary.overview.totalDistance}km`)
        console.log(`Route Type: ${itinerary.overview.routeType}`)
        console.log(`Route Efficiency: ${itinerary.route.efficiency}%`)
        console.log(`Transport Legs: ${itinerary.transport.legs.length}`)
        console.log(`Total Accommodations: ${itinerary.accommodation.cities.length}`)
        console.log(`Total Activities: ${itinerary.activities.totalActivities}`)
        console.log(`Budget Optimized: $${itinerary.budget.totalBudget}`)
        console.log(`Planning Confidence: ${itinerary.metadata.confidence}%`)
        console.log(`Daily Itinerary Days: ${itinerary.dailyItinerary.length}`)
        
        console.log('\nHighlights:')
        itinerary.overview.highlights.forEach(h => console.log(`• ${h}`))
        
        console.log('\nBooking Checklist:')
        itinerary.bookingChecklist.forEach(item => 
          console.log(`• [${item.priority.toUpperCase()}] ${item.item} - $${item.estimatedCost}`)
        )
        
        if (itinerary.metadata.warnings.length > 0) {
          console.log('\nWarnings:')
          itinerary.metadata.warnings.forEach(w => console.log(`⚠️ ${w}`))
        }
      } else {
        console.log('❌ No comprehensive itinerary generated')
      }
    }

    // Test 2: European Multi-City Tour
    console.log('\n\n=== Test 2: European Multi-City Tour ===')
    
    const euroConversationId = 'euro-multi-city-test-' + Date.now()
    
    // Step 1: Test with European cities
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: euroConversationId,
        slot: 'destination',
        value: 'London, Paris, and Rome'
      })
    })
    
    result = await response.json()
    console.log('European Multi-City Detection:', result.confirmation)
    console.log('Detected cities:', result.state?.destination?.tripScope?.detectedCities)
    console.log('Scope:', result.state?.destination?.tripScope?.scope)
    
    // Test 3: Comprehensive Tour
    console.log('\n\n=== Test 3: Comprehensive Country Tour ===')
    
    const tourConversationId = 'tour-test-' + Date.now()
    
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: tourConversationId,
        slot: 'destination',
        value: 'tour of Ireland'
      })
    })
    
    result = await response.json()
    console.log('Comprehensive Tour Detection:', result.confirmation)
    console.log('Scope:', result.state?.destination?.tripScope?.scope)
    console.log('Estimated duration:', result.state?.destination?.tripScope?.estimatedDuration)
    
    console.log('\n✅ All multi-city tests completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testMultiCityPlanning()