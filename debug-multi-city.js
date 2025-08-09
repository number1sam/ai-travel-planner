// Debug multi-city extraction logic
function extractMultiCityDestination(input) {
    const lowerInput = input.toLowerCase()
    console.log("Input:", lowerInput)
    
    // European cities
    const europeanCities = [
      'paris', 'rome', 'barcelona', 'madrid', 'london', 'amsterdam', 'berlin',
      'vienna', 'prague', 'budapest', 'florence', 'venice', 'milan', 'naples',
      'lisbon', 'porto', 'athens', 'santorini', 'mykonos', 'dublin', 'edinburgh'
    ]
    
    // Count European cities mentioned
    const europeanMatches = europeanCities.filter(city => lowerInput.includes(city))
    console.log("European matches:", europeanMatches)
    
    // If multiple European cities mentioned, suggest Europe tour
    if (europeanMatches.length >= 2) {
      // Determine primary region
      const franceCities = ['paris']
      const italyCities = ['rome', 'florence', 'venice', 'milan', 'naples']
      const spainCities = ['barcelona', 'madrid']
      
      const franceCount = franceCities.filter(city => europeanMatches.includes(city)).length
      const italyCount = italyCities.filter(city => europeanMatches.includes(city)).length  
      const spainCount = spainCities.filter(city => europeanMatches.includes(city)).length
      
      console.log("Counts:", { franceCount, italyCount, spainCount })
      
      if (italyCount > 0 && franceCount > 0) {
        return 'France & Italy'
      } else if (italyCount > 0 && spainCount > 0) {
        return 'Italy & Spain'  
      } else if (franceCount > 0 && spainCount > 0) {
        return 'France & Spain'
      } else if (italyCount >= 2) {
        return 'Italy'
      } else if (franceCount >= 1) {
        return 'France'
      } else if (spainCount >= 1) {
        return 'Spain'
      } else {
        return 'Europe' // Generic Europe for other combinations
      }
    }
    
    return null
}

// Test the problematic input
const result = extractMultiCityDestination("I want to visit Paris, Rome, and Barcelona")
console.log("Result:", result)