import { NextRequest, NextResponse } from 'next/server'

// Function to extract destination from user input
function extractDestination(userInput: string): string {
  const input = userInput.toLowerCase().trim()
  
  // Common travel phrases to remove
  const travelPhrases = [
    /^i\s+(would\s+like\s+to|want\s+to|am\s+going\s+to|plan\s+to)\s+go\s+to\s+/,
    /^i\s+(would\s+like\s+to|want\s+to|am\s+planning\s+to)\s+(visit|travel\s+to)\s+/,
    /^let'?s\s+go\s+to\s+/,
    /^how\s+about\s+/,
    /^what\s+about\s+/,
    /^i'?m\s+(thinking\s+(of|about)|considering)\s+/,
    /^maybe\s+/,
    /^perhaps\s+/,
    /^we\s+(would\s+like\s+to|want\s+to|are\s+going\s+to)\s+(go\s+to|visit)\s+/
  ]
  
  let extracted = input
  
  // Remove common travel phrases
  for (const phrase of travelPhrases) {
    extracted = extracted.replace(phrase, '').trim()
  }
  
  // Remove common trailing words
  const trailingWords = [
    /\s+(please|thanks?|thank\s+you)$/,
    /\s+for\s+(vacation|holiday|honeymoon|trip|travel)$/,
    /\s+on\s+(vacation|holiday|honeymoon|a\s+trip)$/
  ]
  
  for (const trailing of trailingWords) {
    extracted = extracted.replace(trailing, '').trim()
  }
  
  // If nothing meaningful remains, return original
  if (extracted.length < 2) {
    return userInput.trim()
  }
  
  return extracted
}

export async function POST(request: NextRequest) {
  try {
    const { destination, originalInput } = await request.json()
    
    if (!destination) {
      return NextResponse.json({ isValid: false }, { status: 400 })
    }
    
    // If originalInput is provided, extract the destination from it
    let actualDestination = destination
    if (originalInput && originalInput !== destination) {
      actualDestination = extractDestination(originalInput)
      console.log(`Original input: "${originalInput}" → Extracted: "${actualDestination}"`)
    }
    
    // Clean and normalize the destination input
    const cleanDestination = actualDestination.toLowerCase().trim()
    
    // Enhanced validation patterns for real destinations
    const validDestinationPatterns = [
      // Major cities worldwide (exact spellings only)
      /\b(paris|london|tokyo|rome|barcelona|amsterdam|dubai|singapore|bangkok|istanbul|sydney|melbourne|toronto|vancouver|montreal|new york|los angeles|san francisco|chicago|miami|boston|washington|seattle|berlin|munich|vienna|zurich|geneva|stockholm|oslo|copenhagen|helsinki|madrid|lisbon|brussels|prague|budapest|warsaw|moscow|st petersburg|cairo|marrakech|casablanca|cape town|johannesburg|nairobi|mumbai|delhi|bangkok|jakarta|kuala lumpur|hong kong|seoul|beijing|shanghai|manila|ho chi minh)\b/,
      
      // Countries and regions (exact spellings only)  
      /\b(france|spain|italy|germany|netherlands|belgium|switzerland|austria|portugal|greece|turkey|egypt|morocco|south africa|india|china|japan|thailand|vietnam|malaysia|indonesia|singapore|australia|new zealand|canada|usa|united states|mexico|brazil|argentina|chile|peru|colombia|ecuador|bolivia|uruguay|norway|sweden|denmark|finland|iceland|poland|czech republic|hungary|romania|bulgaria|croatia|slovenia|serbia|montenegro|bosnia|albania|macedonia|moldova|ukraine|belarus|lithuania|latvia|estonia|russia)\b/,
      
      // Famous islands and coastal destinations
      /\b(seychelles|maldives|mauritius|fiji|tahiti|bora bora|hawaii|caribbean|bahamas|jamaica|barbados|cuba|dominican republic|puerto rico|virgin islands|canary islands|balearic islands|corsica|sardinia|sicily|crete|rhodes|mykonos|santorini|ibiza|mallorca|menorca|cyprus|malta|madeira|azores|bali|lombok|phuket|koh samui|langkawi|penang|boracay|palawan|jeju|okinawa)\b/,
      
      // Mountain ranges and nature destinations
      /\b(alps|himalayas|andes|rockies|pyrenees|carpathians|urals|atlas|kilimanjaro|mont blanc|matterhorn|everest|k2|denali|aconcagua|patagonia|amazon|sahara|serengeti|masai mara|kruger|yellowstone|yosemite|grand canyon|niagara falls|victoria falls|iguazu falls|angel falls)\b/,
      
      // Common destination suffixes (but be more strict)
      /\b[a-z]{3,}\s+(city|island|beach|national park|falls|mountain|valley|lake|river|coast|bay|peninsula|archipelago|region|province|state|county|district)\b/,
      
      // Format patterns that suggest real places (stricter)
      /^[a-z\s\-']{3,},\s*[a-z\s]{2,}$/,  // City, Country format
      /\b(north|south|east|west|upper|lower|new|old|saint|san|santa|port|cape|mount|lake)\s+[a-z]{3,}/,
    ]
    
    // Common misspellings and invalid patterns to catch
    const commonMisspellings = [
      /\b(grece|greace|greese)\b/,  // Greece misspellings
      /\b(frence|frace)\b/,         // France misspellings
      /\b(spane|spayn)\b/,          // Spain misspellings
      /\b(italie|itally)\b/,        // Italy misspellings
      /\b(germeny|germany)\b/,      // Germany misspellings
      /\b(japn|japane)\b/,          // Japan misspellings
      /\b(thayland|tiland)\b/,      // Thailand misspellings
      /\b(pitza|pizza)\b/,          // Common confusion - pizza is food, not a destination
      /\b(londun|londin)\b/,        // London misspellings
      /\b(pariz|parris)\b/,         // Paris misspellings
      /\b(tokio|tokyio)\b/,         // Tokyo misspellings
    ]
    
    // Invalid patterns that suggest fake destinations
    const invalidPatterns = [
      /\b(fake|test|example|demo|sample|invalid|nowhere|fictional)\b/,
      /^[a-z]{1,2}$|^\d+$|^[^a-z]*$/,  // Too short or only numbers/symbols
      /\b(hell|heaven|paradise|utopia|atlantis|wonderland|neverland|oz)\b/,  // Fictional places
    ]
    
    // Check for common misspellings first
    const hasMisspelling = commonMisspellings.some(pattern => pattern.test(cleanDestination))
    if (hasMisspelling) {
      // Special case for "pitza/pizza"
      if (cleanDestination.includes('pitza') || cleanDestination.includes('pizza')) {
        return NextResponse.json({ 
          isValid: false, 
          reason: `I could not find "${actualDestination}" as a travel destination. Did you perhaps mean Italy (where pizza originates from) or another specific city or country?`
        })
      }
      
      return NextResponse.json({ 
        isValid: false, 
        reason: `"${actualDestination}" appears to be a misspelling. Could you please specify the exact country, city, or region you'd like to visit?`
      })
    }
    
    // Check for invalid patterns
    const hasInvalidPattern = invalidPatterns.some(pattern => pattern.test(cleanDestination))
    if (hasInvalidPattern) {
      return NextResponse.json({ 
        isValid: false, 
        reason: 'Contains invalid or fictional place names' 
      })
    }
    
    // Check for valid destination patterns (exact matches only)
    const hasValidPattern = validDestinationPatterns.some(pattern => pattern.test(cleanDestination))
    
    if (hasValidPattern) {
      return NextResponse.json({ 
        isValid: true, 
        details: `Recognized "${actualDestination}" as a valid travel destination.`,
        confidence: 'high'
      })
    }
    
    // For unknown destinations, be more strict and require clarification
    if (cleanDestination.length >= 3 && cleanDestination.length <= 50) {
      // Check if it contains reasonable character patterns for place names
      const reasonablePattern = /^[a-z\s\-'\.]+$/
      if (reasonablePattern.test(cleanDestination)) {
        // Even if it looks reasonable, we'll ask for clarification for unknown places
        return NextResponse.json({ 
          isValid: false,
          reason: `I couldn't find "${actualDestination}" as a recognized travel destination. Could you please specify the exact country, city, or region you'd like to visit?`
        })
      }
    }
    
    // If nothing matches, it's definitely invalid
    return NextResponse.json({ 
      isValid: false,
      reason: `I could not find "${actualDestination}" as a travel destination. Please provide a different place you'd like to visit. You can specify a city, country, region, or famous landmark.`
    })
    
  } catch (error) {
    console.error('Destination validation API error:', error)
    return NextResponse.json({ 
      isValid: true, 
      details: 'Unable to validate, proceeding with caution' 
    }, { status: 200 })
  }
}