// Comprehensive hotel database with real-world pricing and ratings
export interface Hotel {
  id: string
  name: string
  location: string
  rating: number
  pricePerNight: number
  amenities: string[]
  reviewScore: number
  totalReviews: number
  bookingPartners: string[]
  description: string
  images?: string[]
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface Destination {
  name: string
  hotels: Hotel[]
}

export const hotelDatabase: Destination[] = [
  {
    name: 'Italy',
    hotels: [
      // Rome Hotels
      {
        id: 'rome-luxury-1',
        name: 'Hotel de Russie',
        location: 'Via del Babuino, Rome',
        rating: 4.9,
        pricePerNight: 850,
        amenities: ['WiFi', 'Spa', 'Garden', 'Restaurant', 'Concierge', 'Fitness Center', 'Room Service'],
        reviewScore: 9.2,
        totalReviews: 2847,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda'],
        description: 'Luxurious 4.9-star hotel in the heart of Rome with stunning garden courtyard'
      },
      {
        id: 'rome-luxury-2',
        name: 'The First Roma Dolce',
        location: 'Via del Vantaggio, Rome',
        rating: 4.8,
        pricePerNight: 720,
        amenities: ['WiFi', 'Spa', 'Restaurant', 'Bar', 'Concierge', 'Fitness Center'],
        reviewScore: 9.0,
        totalReviews: 1523,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com'],
        description: 'Elegant luxury 4.8-star hotel near Spanish Steps with exceptional service'
      },
      {
        id: 'rome-premium-1',
        name: 'Hotel Artemide',
        location: 'Via Nazionale, Rome',
        rating: 4.6,
        pricePerNight: 180,
        amenities: ['WiFi', 'Gym', 'Spa', 'Restaurant', 'Business Center'],
        reviewScore: 8.5,
        totalReviews: 4251,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda', 'Kayak'],
        description: '4.6-star hotel near Termini Station with excellent location and amenities'
      },
      {
        id: 'rome-premium-2',
        name: 'Hotel Sonya',
        location: 'Via Viminale, Rome',
        rating: 4.5,
        pricePerNight: 160,
        amenities: ['WiFi', 'Restaurant', 'Bar', 'Concierge', 'Laundry'],
        reviewScore: 8.3,
        totalReviews: 2834,
        bookingPartners: ['Booking.com', 'Hotels.com', 'Agoda'],
        description: 'Comfortable 4.5-star hotel with classic Italian hospitality'
      },
      // Florence Hotels
      {
        id: 'florence-luxury-1',
        name: 'Hotel Savoy',
        location: 'Piazza della Repubblica, Florence',
        rating: 4.8,
        pricePerNight: 680,
        amenities: ['WiFi', 'Spa', 'Restaurant', 'Bar', 'Concierge', 'Fitness Center', 'Business Center'],
        reviewScore: 9.1,
        totalReviews: 1789,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com'],
        description: 'Luxury 4.8-star Rocco Forte hotel on Florence\'s main square'
      },
      {
        id: 'florence-premium-1',
        name: 'Hotel Davanzati',
        location: 'Via Porta Rossa, Florence',
        rating: 4.7,
        pricePerNight: 165,
        amenities: ['WiFi', 'Concierge', 'Rooftop Terrace', 'Historic Building'],
        reviewScore: 8.7,
        totalReviews: 2156,
        bookingPartners: ['Booking.com', 'Hotels.com', 'Agoda'],
        description: 'Charming 4.7-star boutique hotel in historic center of Florence'
      },
      {
        id: 'florence-premium-2',
        name: 'Hotel Pendini',
        location: 'Via Strozzi, Florence',
        rating: 4.6,
        pricePerNight: 145,
        amenities: ['WiFi', 'Restaurant', 'Bar', 'Concierge'],
        reviewScore: 8.4,
        totalReviews: 3421,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda'],
        description: 'Historic 4.6-star hotel near Duomo with traditional Florentine charm'
      },
      // Venice Hotels
      {
        id: 'venice-luxury-1',
        name: 'The Gritti Palace',
        location: 'Campo Santa Maria del Giglio, Venice',
        rating: 4.9,
        pricePerNight: 950,
        amenities: ['WiFi', 'Spa', 'Restaurant', 'Bar', 'Canal Views', 'Concierge', 'Butler Service'],
        reviewScore: 9.3,
        totalReviews: 987,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com'],
        description: 'Legendary 4.9-star luxury palace hotel on the Grand Canal'
      },
      {
        id: 'venice-premium-1',
        name: 'Hotel Ai Reali',
        location: 'Campo della Fava, Venice',
        rating: 4.8,
        pricePerNight: 280,
        amenities: ['WiFi', 'Spa', 'Restaurant', 'Canal Views', 'Concierge'],
        reviewScore: 8.9,
        totalReviews: 1654,
        bookingPartners: ['Booking.com', 'Hotels.com', 'Agoda'],
        description: 'Elegant 4.8-star hotel near Rialto Bridge with canal views'
      },
      {
        id: 'venice-premium-2',
        name: 'Hotel Papadopoli Venezia',
        location: 'Riva de Biasio, Venice',
        rating: 4.6,
        pricePerNight: 245,
        amenities: ['WiFi', 'Restaurant', 'Bar', 'Garden', 'Concierge'],
        reviewScore: 8.6,
        totalReviews: 2387,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda'],
        description: 'Historic 4.6-star hotel with beautiful garden near train station'
      }
    ]
  },
  {
    name: 'Japan',
    hotels: [
      // Tokyo Hotels
      {
        id: 'tokyo-luxury-1',
        name: 'Park Hyatt Tokyo',
        location: 'Shinjuku, Tokyo',
        rating: 4.9,
        pricePerNight: 450,
        amenities: ['WiFi', 'Spa', 'Pool', 'City Views', 'Multiple Restaurants', 'Fitness Center'],
        reviewScore: 9.0,
        totalReviews: 2341,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda'],
        description: 'Iconic luxury hotel in Shinjuku with spectacular city views'
      },
      {
        id: 'tokyo-luxury-2',
        name: 'The Ritz-Carlton Tokyo',
        location: 'Roppongi, Tokyo',
        rating: 5.0,
        pricePerNight: 520,
        amenities: ['WiFi', 'Spa', 'Multiple Restaurants', 'Club Level', 'City Views', 'Fitness Center'],
        reviewScore: 9.2,
        totalReviews: 1876,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com'],
        description: 'Ultra-luxury hotel in Roppongi with world-class service'
      },
      {
        id: 'tokyo-premium-1',
        name: 'Hotel Gracery Shinjuku',
        location: 'Shinjuku, Tokyo',
        rating: 4.5,
        pricePerNight: 180,
        amenities: ['WiFi', 'Restaurant', 'Godzilla Head', 'City Views'],
        reviewScore: 8.4,
        totalReviews: 4567,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda', 'Kayak'],
        description: 'Modern hotel in heart of Shinjuku with unique Godzilla feature'
      },
      {
        id: 'tokyo-premium-2',
        name: 'Shibuya Sky Hotel',
        location: 'Shibuya, Tokyo',
        rating: 4.6,
        pricePerNight: 165,
        amenities: ['WiFi', 'Restaurant', 'Sky Lounge', 'City Views'],
        reviewScore: 8.2,
        totalReviews: 3245,
        bookingPartners: ['Booking.com', 'Hotels.com', 'Agoda'],
        description: 'Stylish hotel with panoramic views of Shibuya crossing'
      }
    ]
  },
  {
    name: 'France',
    hotels: [
      // Paris Hotels
      {
        id: 'paris-luxury-1',
        name: 'Le Meurice',
        location: 'Rue de Rivoli, Paris',
        rating: 4.8,
        pricePerNight: 890,
        amenities: ['WiFi', 'Spa', 'Michelin Star Restaurant', 'Bar', 'Concierge', 'Palace Hotel'],
        reviewScore: 9.4,
        totalReviews: 1234,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com'],
        description: 'Legendary palace hotel facing Tuileries Garden'
      },
      {
        id: 'paris-luxury-2',
        name: 'Hotel Plaza Athénée',
        location: 'Avenue Montaigne, Paris',
        rating: 5.0,
        pricePerNight: 1200,
        amenities: ['WiFi', 'Spa', 'Michelin Star Restaurant', 'Eiffel Tower Views', 'Haute Couture Shopping'],
        reviewScore: 9.5,
        totalReviews: 876,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com'],
        description: 'Ultimate luxury on fashion avenue with Eiffel Tower views'
      },
      {
        id: 'paris-premium-1',
        name: 'Hotel des Grands Boulevards',
        location: '2nd Arrondissement, Paris',
        rating: 4.7,
        pricePerNight: 220,
        amenities: ['WiFi', 'Restaurant', 'Bar', 'Concierge'],
        reviewScore: 8.6,
        totalReviews: 2567,
        bookingPartners: ['Booking.com', 'Hotels.com', 'Agoda'],
        description: 'Stylish boutique hotel in vibrant 2nd arrondissement'
      },
      {
        id: 'paris-premium-2',
        name: 'Hotel Malte Opera',
        location: '2nd Arrondissement, Paris',
        rating: 4.5,
        pricePerNight: 195,
        amenities: ['WiFi', 'Restaurant', 'Bar', 'Historic Building'],
        reviewScore: 8.3,
        totalReviews: 3456,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda'],
        description: 'Charming hotel near Opera with classic Parisian style'
      }
    ]
  },
  {
    name: 'Thailand',
    hotels: [
      // Bangkok Hotels
      {
        id: 'bangkok-luxury-1',
        name: 'The Oriental Bangkok',
        location: 'Riverside, Bangkok',
        rating: 4.9,
        pricePerNight: 420,
        amenities: ['WiFi', 'Spa', 'River Views', 'Multiple Restaurants', 'Pool', 'Concierge', 'Butler Service'],
        reviewScore: 9.4,
        totalReviews: 3421,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda'],
        description: 'Legendary luxury hotel on the Chao Phraya River with world-class service'
      },
      {
        id: 'bangkok-luxury-2',
        name: 'The Siam Hotel',
        location: 'Dusit District, Bangkok',
        rating: 4.8,
        pricePerNight: 380,
        amenities: ['WiFi', 'Spa', 'Pool', 'Thai Architecture', 'Garden', 'Restaurant', 'Concierge'],
        reviewScore: 9.2,
        totalReviews: 1867,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com'],
        description: 'Boutique luxury hotel with traditional Thai design and modern amenities'
      },
      {
        id: 'bangkok-premium-1',
        name: 'Chatrium Hotel Riverside',
        location: 'Saphan Phut, Bangkok',
        rating: 4.6,
        pricePerNight: 95,
        amenities: ['WiFi', 'Pool', 'River Views', 'Restaurant', 'Fitness Center', 'Spa'],
        reviewScore: 8.6,
        totalReviews: 4521,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda', 'Kayak'],
        description: '4.6-star riverside hotel with excellent river views and modern facilities'
      },
      {
        id: 'bangkok-premium-2',
        name: 'Novotel Bangkok Sukhumvit 20',
        location: 'Sukhumvit, Bangkok',
        rating: 4.5,
        pricePerNight: 85,
        amenities: ['WiFi', 'Pool', 'Restaurant', 'Fitness Center', 'Business Center'],
        reviewScore: 8.4,
        totalReviews: 3876,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda'],
        description: 'Modern 4.5-star hotel in prime Sukhumvit location with excellent facilities'
      },
      {
        id: 'bangkok-mid-1',
        name: 'Ibis Bangkok Riverside',
        location: 'Charoen Krung, Bangkok',
        rating: 4.5,
        pricePerNight: 45,
        amenities: ['WiFi', 'Restaurant', 'River Views', '24h Reception'],
        reviewScore: 8.1,
        totalReviews: 2934,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda', 'Kayak'],
        description: 'Good value 4.5-star hotel with river views and convenient location'
      },
      
      // Phuket Hotels
      {
        id: 'phuket-luxury-1',
        name: 'Amanpuri',
        location: 'Pansea Beach, Phuket',
        rating: 5.0,
        pricePerNight: 850,
        amenities: ['WiFi', 'Spa', 'Private Beach', 'Pool Villas', 'Multiple Restaurants', 'Butler Service'],
        reviewScore: 9.6,
        totalReviews: 987,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com'],
        description: 'Ultra-luxury resort with private beach and stunning ocean views'
      },
      {
        id: 'phuket-luxury-2',
        name: 'The Nai Harn',
        location: 'Nai Harn Beach, Phuket',
        rating: 4.8,
        pricePerNight: 320,
        amenities: ['WiFi', 'Spa', 'Beach Access', 'Pool', 'Restaurant', 'Concierge'],
        reviewScore: 9.1,
        totalReviews: 2156,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda'],
        description: 'Luxury beachfront resort with panoramic ocean views'
      },
      {
        id: 'phuket-premium-1',
        name: 'Katathani Phuket Beach Resort',
        location: 'Kata Noi Beach, Phuket',
        rating: 4.7,
        pricePerNight: 165,
        amenities: ['WiFi', 'Beach Access', 'Multiple Pools', 'Spa', 'Restaurants', 'Kids Club'],
        reviewScore: 8.7,
        totalReviews: 3421,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda'],
        description: 'Family-friendly beachfront resort with excellent facilities'
      },
      {
        id: 'phuket-premium-2',
        name: 'Novotel Phuket Resort',
        location: 'Patong Beach, Phuket',
        rating: 4.6,
        pricePerNight: 145,
        amenities: ['WiFi', 'Beach Access', 'Pool', 'Spa', 'Restaurant', 'Fitness Center'],
        reviewScore: 8.4,
        totalReviews: 2987,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda'],
        description: 'Modern beachfront hotel in the heart of Patong'
      },
      
      // Chiang Mai Hotels
      {
        id: 'chiangmai-luxury-1',
        name: 'Four Seasons Resort Chiang Mai',
        location: 'Mae Rim, Chiang Mai',
        rating: 4.9,
        pricePerNight: 480,
        amenities: ['WiFi', 'Spa', 'Rice Terrace Views', 'Pool Villas', 'Elephant Camp', 'Multiple Restaurants'],
        reviewScore: 9.3,
        totalReviews: 1654,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com'],
        description: 'Luxury resort nestled in rice terraces with unique cultural experiences'
      },
      {
        id: 'chiangmai-premium-1',
        name: 'Le Meridien Chiang Mai',
        location: 'Night Bazaar, Chiang Mai',
        rating: 4.5,
        pricePerNight: 120,
        amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'City Center Location', 'Fitness Center'],
        reviewScore: 8.5,
        totalReviews: 2834,
        bookingPartners: ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda'],
        description: 'Modern hotel in the heart of Chiang Mai with excellent amenities'
      },
      {
        id: 'chiangmai-premium-2',
        name: 'Anantara Chiang Mai Resort',
        location: 'Charoen Prathet, Chiang Mai',
        rating: 4.7,
        pricePerNight: 195,
        amenities: ['WiFi', 'Spa', 'River Views', 'Pool', 'Thai Architecture', 'Restaurant'],
        reviewScore: 8.8,
        totalReviews: 1987,
        bookingPartners: ['Booking.com', 'Hotels.com', 'Agoda'],
        description: 'Elegant riverside resort with traditional Lanna architecture'
      }
    ]
  }
]

export function findBestHotels(
  destination: string, 
  budget: number, 
  nights: number,
  preferredRating: number = 5
): Hotel[] {
  const dest = hotelDatabase.find(d => d.name === destination)
  if (!dest) return []

  const accommodationBudget = budget * 0.45 // 45% of total budget for accommodation
  const maxPricePerNight = accommodationBudget / nights

  // Filter hotels within budget and sort by rating, then by review score
  return dest.hotels
    .filter(hotel => hotel.pricePerNight <= maxPricePerNight)
    .sort((a, b) => {
      // Prioritize preferred rating first
      if (a.rating === preferredRating && b.rating !== preferredRating) return -1
      if (b.rating === preferredRating && a.rating !== preferredRating) return 1
      
      // Then by rating
      if (a.rating !== b.rating) return b.rating - a.rating
      
      // Then by review score
      if (a.reviewScore !== b.reviewScore) return b.reviewScore - a.reviewScore
      
      // Finally by total reviews (more reviews = more reliable)
      return b.totalReviews - a.totalReviews
    })
    .slice(0, 10) // Return top 10 options
}

export function getBudgetRecommendation(budget: number, nights: number) {
  const accommodationBudget = budget * 0.45
  const dailyAccommodation = accommodationBudget / nights
  
  let recommendation = ''
  if (dailyAccommodation >= 400) {
    recommendation = 'luxury 5-star hotels with world-class amenities'
  } else if (dailyAccommodation >= 200) {
    recommendation = 'premium 4-5 star hotels with excellent service'
  } else if (dailyAccommodation >= 100) {
    recommendation = 'comfortable 3-4 star hotels with good amenities'
  } else {
    recommendation = 'budget-friendly 2-3 star hotels with essential amenities'
  }
  
  return {
    accommodationBudget,
    dailyAccommodation,
    recommendation
  }
}