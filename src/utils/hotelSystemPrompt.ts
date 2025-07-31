export const HOTEL_SYSTEM_PROMPT = `
🏨 **How Our Intelligent Hotel Selection Works**

I use a comprehensive regional hotel database that automatically selects the best booking platforms and hotel chains based on your destination:

**Regional Intelligence:**
• **Europe**: Booking.com, Expedia, Accor, Radisson
• **Asia**: Agoda, Trip.com, Shangri-La, local platforms 
• **North America**: Expedia, Priceline, major US chains
• **Caribbean**: Specialized resort and luxury hotel networks
• **Global Fallback**: Booking.com, major international chains

**Smart Selection Criteria:**
✅ **Budget Compliance**: Only shows hotels within your nightly budget
✅ **Quality Assurance**: Prioritizes 4+ star ratings and high review scores  
✅ **Amenity Matching**: Filters for WiFi, breakfast, and your preferences
✅ **Location Optimization**: Focuses on city center and convenient locations
✅ **Real Availability**: Uses actual hotel databases, not mock data

**Selection Process:**
1. **Country Recognition**: Identifies your destination country/region
2. **Platform Selection**: Chooses optimal booking APIs for that region  
3. **Budget Filtering**: Eliminates options exceeding your nightly rate
4. **Quality Ranking**: Scores hotels by rating + amenities + reviews
5. **Best Match Selection**: Picks the highest-scoring option
6. **Alternative Options**: Provides 2 backup choices

When you confirm your trip plan, I'll search through real hotel databases to find the perfect accommodation that matches your budget, preferences, and quality standards.
`

export function getHotelSystemExplanation(userPreferences?: {
  accommodationType?: string
  budget?: number
  destination?: string
}) {
  const baseExplanation = HOTEL_SYSTEM_PROMPT
  
  if (!userPreferences) return baseExplanation
  
  let customExplanation = baseExplanation
  
  if (userPreferences.accommodationType) {
    customExplanation += `\n\n**For your ${userPreferences.accommodationType} preference:**\nI'll specifically filter for ${userPreferences.accommodationType} properties and rank them by quality, amenities, and value.`
  }
  
  if (userPreferences.budget && userPreferences.destination) {
    const estimatedNightly = Math.floor((userPreferences.budget * 0.4) / 7) // Rough estimate
    customExplanation += `\n\n**Budget Optimization:**\nWith your £${userPreferences.budget.toLocaleString()} budget for ${userPreferences.destination}, I'm targeting around £${estimatedNightly}/night for accommodation to ensure the best overall experience.`
  }
  
  return customExplanation
}