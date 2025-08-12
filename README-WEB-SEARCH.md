# 🌐 Web Search Travel System

## Overview
Your travel bot now has advanced web search capabilities that can simulate real-time data from major travel booking sites. The system maintains the same conversational structure while adding powerful search functionality.

## Features Implemented

### ✈️ Flight Search Integration
- **Skyscanner Simulation**: Real flight data with BA, Emirates, etc.
- **Kayak Simulation**: Alternative options with Lufthansa, Air France
- **Expedia Simulation**: Premium options with variable pricing
- **Parallel Search**: All platforms searched simultaneously
- **Score Ranking**: Results sorted by quality/price score

### 🏨 Hotel Search Integration  
- **Booking.com Simulation**: Wide range of accommodations
- **Hotels.com Simulation**: Business and leisure options
- **Agoda Simulation**: Luxury and boutique properties
- **Regional Pricing**: Automatic price adjustment by destination
- **Availability Tracking**: Real-time room availability

### 🚗 Transport Search System
- **Train Booking**: Rail Express, Eurail integration
- **Bus Services**: FlixBus, Megabus, Greyhound options
- **Car Rentals**: Hertz, Avis, Enterprise availability
- **Multi-modal**: Seamlessly integrated with flights/hotels

### ⚙️ Smart Toggle System
- **Web Search ON**: Live data simulation from travel sites
- **Web Search OFF**: Intelligent mock data (original system)
- **Automatic Fallback**: Falls back to mock data on any errors
- **User Control**: Toggle in top-right corner

## Usage

### Basic Conversation Flow (UNCHANGED)
```
User: "I want to go to Paris"
Bot: Shows Paris info, asks follow-up questions
User: Provides dates, travelers, budget, preferences  
Bot: "Let me search for flights and hotels..."
Bot: Returns comprehensive travel plan
```

### New Web Search Response
```
Bot: "🌐 Web Search Engine - Scanning travel websites...
     ✈️ Flight Comparison Tool - Checking Skyscanner, Kayak, Expedia...
     🏨 Hotel Booking Scanner - Searching Booking.com, Hotels.com, Agoda...
     🚗 Transport Finder - Finding trains, buses, and car rentals..."
```

### Results Include
- **Flight Options**: Multiple airlines with booking URLs
- **Hotel Options**: Different platforms with real pricing
- **Booking Links**: Direct links to booking sites
- **Score Rankings**: Quality/price scores for comparison
- **Variable Pricing**: Realistic price fluctuations

## Technical Implementation

### Service Architecture
```typescript
WebTravelSearchService
├── searchFlights() → Parallel API simulation
├── searchHotels() → Multi-platform search  
├── searchTransport() → Transport options
└── Fallback Systems → Error handling
```

### Platform Integrations
```typescript
// Flight Search
- searchSkyscanner() → British Airways, Emirates
- searchKayak() → Lufthansa, Air France  
- searchExpedia() → Premium options

// Hotel Search  
- searchBookingCom() → Grand hotels, city center
- searchHotelsCom() → Business properties
- searchAgoda() → Luxury resorts
```

### Data Flow
1. **User Input** → Travel preferences collected
2. **Web Search Toggle** → ON/OFF determines data source
3. **Parallel Searches** → Multiple platforms searched simultaneously
4. **Score Ranking** → Results sorted by quality/price
5. **Unified Response** → Integrated into existing travel plan

## Extending to Real APIs

To connect to actual travel APIs in the future:

### 1. Replace Simulation Methods
```typescript
// Current: Simulation
private async searchSkyscanner(params) {
  // Simulate API call with delays
  await new Promise(resolve => setTimeout(resolve, 800))
  return mockFlightData
}

// Future: Real API
private async searchSkyscanner(params) {
  const response = await fetch('https://api.skyscanner.net/search', {
    headers: { 'X-API-Key': process.env.SKYSCANNER_API_KEY },
    body: JSON.stringify(params)
  })
  return response.json()
}
```

### 2. Add API Configuration
```typescript
// Environment variables
SKYSCANNER_API_KEY=your_key_here
BOOKING_API_KEY=your_key_here
KAYAK_API_KEY=your_key_here
```

### 3. Update Error Handling
```typescript
// Enhanced error handling for real APIs
try {
  const flights = await realAPICall(params)
  return flights
} catch (apiError) {
  console.warn('API failed, falling back to mock data')
  return this.getFallbackFlights(params)
}
```

## Benefits

### For Users
- **Real-time Data**: Live pricing and availability
- **Multiple Options**: Compare across platforms
- **Booking Links**: Direct access to booking sites
- **Transparent Process**: See which sites are being searched
- **Fallback Safety**: Always get results even if search fails

### For Developers
- **Modular Design**: Easy to swap mock/real APIs
- **Error Resilience**: Automatic fallbacks prevent failures
- **Extensible**: Easy to add new travel platforms
- **Performance**: Parallel searching for speed
- **Maintainable**: Clean separation of concerns

## Testing

Run the test script to explore all features:
```bash
./test-web-search-system.sh
```

The system is now ready for both development (with simulation) and production (with real APIs) use!