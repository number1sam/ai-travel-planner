export interface HotelSearchContext {
  destination: string
  city: string
  country: string
  checkIn: string
  checkOut: string
  guests: number
  maxNightlyRate: number
  accommodationType: string
  preferredAmenities: string[]
}

export function generateHotelSearchPrompt(context: HotelSearchContext): string {
  return `
Now that the customer has selected a destination (${context.city}, ${context.country}) and asked to stay in a ${context.accommodationType}, and the budget, dates, and preferences are known, I must select a real hotel.

Using the hotel source list for ${context.country}, which includes region-specific booking platforms. Searching for real hotels available from ${context.checkIn} to ${context.checkOut} for ${context.guests} guests.

Limiting price to under £${context.maxNightlyRate}/night. Prioritizing hotels with:
• 4★ or better rating
• ${context.preferredAmenities.join(' + ')} included
• High review score (8.5+)
• Located in city centre

I will not use made-up hotel names. I'm searching the database to find 1 main hotel and 2 alternatives with cost, amenities, and booking links. The selected hotel will be assigned to every night of the trip.
`
}

export function generateHotelSelectionExplanation(
  selectedHotel: any,
  alternatives: any[],
  context: HotelSearchContext
): string {
  if (!selectedHotel) {
    return `I couldn't find specific hotels matching your criteria in ${context.city}, so I've allocated budget for ${context.accommodationType} accommodation at £${context.maxNightlyRate}/night.`
  }

  let explanation = `🏨 **Selected Hotel for ${context.city}:**\n\n`
  explanation += `**${selectedHotel.name}** (${selectedHotel.stars || 4}★)\n`
  explanation += `• £${selectedHotel.pricePerNight}/night (Total: £${selectedHotel.pricePerNight * selectedHotel.nights})\n`
  explanation += `• Rating: ${selectedHotel.rating}/5 (${selectedHotel.reviews || 'Many'} reviews)\n`
  explanation += `• Location: ${selectedHotel.location}\n`
  explanation += `• Amenities: ${selectedHotel.amenities.join(', ')}\n`
  
  if (selectedHotel.bookingLink) {
    explanation += `• [Book Now](${selectedHotel.bookingLink})\n`
  }

  if (alternatives && alternatives.length > 0) {
    explanation += `\n**Alternative Options:**\n`
    alternatives.forEach((alt, index) => {
      explanation += `${index + 1}. **${alt.name}** - £${alt.pricePerNight}/night, ${alt.rating}/5 rating\n`
      if (alt.link) {
        explanation += `   [View Details](${alt.link})\n`
      }
    })
  }

  return explanation
}

export function shouldSearchHotels(accommodationType: string): boolean {
  const hotelTypes = ['hotel', 'hotels', 'resort', 'resorts', 'boutique', 'luxury'];
  const nonHotelTypes = ['airbnb', 'hostel', 'hostels', 'camping', 'apartment', 'villa'];
  
  const lowerType = accommodationType.toLowerCase();
  
  // If explicitly non-hotel, don't search
  if (nonHotelTypes.some(type => lowerType.includes(type))) {
    return false;
  }
  
  // If explicitly hotel-related, do search
  if (hotelTypes.some(type => lowerType.includes(type))) {
    return true;
  }
  
  // Default to hotel search if ambiguous
  return true;
}