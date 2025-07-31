export type HotelSource = {
  region: string
  countries?: string[]
  primaryAPIs: string[]
  aggregatorSites: string[]
  hotelChains: string[]
}

export const HOTEL_SOURCES: HotelSource[] = [
  {
    region: "Global",
    primaryAPIs: [
      "Booking.com API",
      "Expedia Rapid API",
      "Agoda API",
      "Trip.com API",
      "TravelPayouts API",
      "Amadeus Hotel API"
    ],
    aggregatorSites: [
      "https://www.booking.com",
      "https://www.expedia.com",
      "https://www.agoda.com",
      "https://www.trip.com",
      "https://www.hotels.com",
      "https://www.kayak.com",
      "https://www.trivago.com"
    ],
    hotelChains: [
      "https://www.marriott.com",
      "https://www.hilton.com",
      "https://www.ihg.com",
      "https://www.hyatt.com",
      "https://www.radissonhotels.com",
      "https://www.accor.com",
      "https://www.bestwestern.com",
      "https://www.wyndhamhotels.com"
    ]
  },
  {
    region: "Europe",
    countries: ["Italy", "France", "Spain", "Germany", "United Kingdom", "Netherlands", "Austria", "Switzerland", "Belgium", "Portugal", "Greece", "Czech Republic", "Poland", "Hungary", "Croatia", "Romania", "Bulgaria", "Denmark", "Sweden", "Norway", "Finland"],
    primaryAPIs: ["Booking.com API", "Expedia Rapid API"],
    aggregatorSites: [
      "https://www.booking.com",
      "https://www.edreams.com",
      "https://www.loveholidays.com",
      "https://www.lastminute.com",
      "https://www.expedia.com"
    ],
    hotelChains: [
      "https://www.accor.com",
      "https://www.radissonhotels.com",
      "https://www.marriott.com",
      "https://www.hilton.com",
      "https://www.ihg.com"
    ]
  },
  {
    region: "Asia",
    countries: ["Japan", "Thailand", "South Korea", "Vietnam", "India", "Indonesia", "Malaysia", "Singapore", "Philippines", "Cambodia", "Laos", "Myanmar", "China", "Taiwan", "Hong Kong", "Macau", "Nepal", "Bhutan", "Sri Lanka", "Maldives"],
    primaryAPIs: ["Agoda API", "Trip.com API", "Booking.com API"],
    aggregatorSites: [
      "https://www.agoda.com",
      "https://www.trip.com",
      "https://travel.rakuten.com",
      "https://www.jalan.net",
      "https://www.booking.com"
    ],
    hotelChains: [
      "https://www.accor.com",
      "https://www.hyatt.com",
      "https://www.ihg.com",
      "https://www.marriott.com",
      "https://www.shangri-la.com"
    ]
  },
  {
    region: "North America",
    countries: ["United States", "Canada", "Mexico"],
    primaryAPIs: ["Expedia Rapid API", "Booking.com API", "Priceline API"],
    aggregatorSites: [
      "https://www.expedia.com",
      "https://www.booking.com",
      "https://www.priceline.com",
      "https://www.hotels.com",
      "https://www.kayak.com",
      "https://www.travelocity.com"
    ],
    hotelChains: [
      "https://www.marriott.com",
      "https://www.hilton.com",
      "https://www.ihg.com",
      "https://www.hyatt.com",
      "https://www.bestwestern.com",
      "https://www.choicehotels.com"
    ]
  },
  {
    region: "Caribbean",
    countries: ["Barbados", "Jamaica", "Bahamas", "Dominican Republic", "Cuba", "Trinidad and Tobago", "Aruba", "Curacao", "Saint Lucia", "Antigua and Barbuda", "Grenada", "Saint Vincent and the Grenadines"],
    primaryAPIs: ["Booking.com API", "Expedia Rapid API", "TravelPayouts API"],
    aggregatorSites: [
      "https://www.booking.com",
      "https://www.expedia.com",
      "https://www.hotels.com",
      "https://www.trivago.com"
    ],
    hotelChains: [
      "https://www.marriott.com",
      "https://www.hilton.com",
      "https://www.hyatt.com",
      "https://www.ihg.com",
      "https://www.accor.com"
    ]
  },
  {
    region: "South America",
    countries: ["Brazil", "Argentina", "Chile", "Peru", "Colombia", "Ecuador", "Bolivia", "Uruguay", "Paraguay", "Venezuela", "Guyana", "Suriname"],
    primaryAPIs: ["Booking.com API", "Expedia Rapid API", "Despegar API"],
    aggregatorSites: [
      "https://www.booking.com",
      "https://www.expedia.com",
      "https://www.despegar.com",
      "https://www.hotels.com"
    ],
    hotelChains: [
      "https://www.marriott.com",
      "https://www.hilton.com",
      "https://www.accor.com",
      "https://www.ihg.com"
    ]
  },
  {
    region: "Africa",
    countries: ["South Africa", "Kenya", "Tanzania", "Morocco", "Egypt", "Tunisia", "Ghana", "Nigeria", "Ethiopia", "Uganda", "Rwanda", "Botswana", "Namibia", "Zimbabwe", "Zambia"],
    primaryAPIs: ["Booking.com API", "Expedia Rapid API", "Jumia Travel API"],
    aggregatorSites: [
      "https://www.booking.com",
      "https://www.expedia.com",
      "https://travel.jumia.com",
      "https://www.hotels.com"
    ],
    hotelChains: [
      "https://www.marriott.com",
      "https://www.hilton.com",
      "https://www.accor.com",
      "https://www.radissonhotels.com"
    ]
  },
  {
    region: "Middle East",
    countries: ["United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Jordan", "Lebanon", "Israel", "Turkey", "Iran"],
    primaryAPIs: ["Booking.com API", "Expedia Rapid API", "Almosafer API"],
    aggregatorSites: [
      "https://www.booking.com",
      "https://www.expedia.com",
      "https://www.almosafer.com",
      "https://www.hotels.com"
    ],
    hotelChains: [
      "https://www.marriott.com",
      "https://www.hilton.com",
      "https://www.hyatt.com",
      "https://www.ihg.com",
      "https://www.accor.com"
    ]
  },
  {
    region: "Oceania",
    countries: ["Australia", "New Zealand", "Fiji", "Papua New Guinea", "Vanuatu", "Solomon Islands", "New Caledonia", "Samoa", "Tonga"],
    primaryAPIs: ["Booking.com API", "Expedia Rapid API", "Wotif API"],
    aggregatorSites: [
      "https://www.booking.com",
      "https://www.expedia.com.au",
      "https://www.wotif.com",
      "https://www.hotels.com"
    ],
    hotelChains: [
      "https://www.marriott.com",
      "https://www.hilton.com",
      "https://www.ihg.com",
      "https://www.accor.com",
      "https://www.hyatt.com"
    ]
  }
]