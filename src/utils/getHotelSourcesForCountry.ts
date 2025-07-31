import { HOTEL_SOURCES, HotelSource } from '../data/hotelSources'

export function getHotelSourcesForCountry(country: string): HotelSource | null {
  // First, try to find a region-specific match
  const regionMatch = HOTEL_SOURCES.find(
    source => source.countries?.includes(country)
  )
  
  if (regionMatch) {
    return regionMatch
  }
  
  // Fallback to global sources
  return HOTEL_SOURCES.find(source => source.region === "Global") || null
}

export function getAllAvailableCountries(): string[] {
  const countries: string[] = []
  
  HOTEL_SOURCES.forEach(source => {
    if (source.countries) {
      countries.push(...source.countries)
    }
  })
  
  return [...new Set(countries)].sort()
}

export function getRegionForCountry(country: string): string {
  const source = HOTEL_SOURCES.find(
    source => source.countries?.includes(country)
  )
  
  return source?.region || "Global"
}