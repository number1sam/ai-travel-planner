# Travel Agent Database Integration

This document describes the comprehensive database integration for the travel planning bot, following the system instructions for database orchestration with PostgreSQL and PostGIS.

## Architecture Overview

The system implements a **Single Source of Truth** pattern with the PostgreSQL database as the authoritative state store. All trip planning state is persisted and managed through structured database operations.

### Core Components

1. **DatabaseOrchestrationService** - Handles all database operations with proper normalization, caching, and auditing
2. **DatabaseAwareConversationManager** - Integrates conversation processing with persistent state management
3. **PostgreSQL + PostGIS** - Primary database with geo-spatial capabilities for location-based queries
4. **Comprehensive Schema** - Covers trip briefs, places, supply caches, itineraries, transfers, and decision logs

## Database Schema Structure

### Core State Management
- **trips** - Trip metadata and status
- **trip_slots** - Normalized slot values (destination, dates, budget, etc.) with fill/lock status
- **trip_preferences** - Travel style, dietary requirements, activity preferences
- **trip_constraints** - Hard and soft constraints with severity levels
- **budgets** - Budget allocation and governance with per-category tracking

### Geographic Data
- **places** - Hierarchical place data with PostGIS geometry (countries → cities → neighborhoods → POIs)
- **Indexes**: GiST spatial indexes, trigram text search, hierarchical relationships

### Supply Chain Caches
- **hotels_cached** - Normalized hotel data with geo-location and amenities
- **activities_cached** - Activity inventory with categories, duration, and policies
- **restaurants_cached** - Restaurant data with cuisine types, dietary tags, and hours
- **flight_offers** - Per-trip flight search results with pricing and routing

### Trip Planning
- **hotel_offers** / **activity_offers** - Filtered and scored offers per trip
- **itineraries** - Versioned trip itineraries with daily structure
- **itinerary_days** / **itinerary_items** - Detailed scheduling with geo-location and costs
- **transfers** - Primary + backup routes for every movement (Two Routes Rule)

### Audit & Traceability
- **search_requests** / **search_results** - Complete search audit trail
- **decision_logs** - Every state change, search, and decision with metadata
- **Materialized Views** - Fast rendering of complex joins (e.g., hotel shortlists)

## Setup Instructions

### 1. Database Setup

#### Using Docker (Recommended)
```bash
# Start PostgreSQL with PostGIS
docker-compose -f docker-compose.database.yml up -d

# Verify services are running
docker-compose -f docker-compose.database.yml ps
```

This will start:
- **PostgreSQL 15** with PostGIS 3.3 on port 5432
- **Redis** for caching on port 6379
- **pgAdmin** for database management on port 8080

#### Manual Setup
```bash
# Install PostgreSQL with PostGIS
sudo apt-get install postgresql-15 postgresql-15-postgis-3

# Create database
sudo -u postgres createdb travel_agent_db
sudo -u postgres createuser travel_agent

# Apply schema
psql -U travel_agent -d travel_agent_db -f database/schema.sql
psql -U travel_agent -d travel_agent_db -f database/seed.sql
```

### 2. Environment Configuration

Copy the example environment file:
```bash
cp .env.database.example .env.local
```

Update the database connection:
```env
DATABASE_URL=postgresql://travel_agent:travel_agent@localhost:5432/travel_agent_db
DATABASE_SSL=false
```

### 3. Dependencies

Install the required Node.js packages:
```bash
npm install pg @types/pg
```

### 4. Start the Application

```bash
npm run dev
```

The database-aware API will be available at `/api/database-conversation`.

## API Usage

### Process User Messages
```bash
POST /api/database-conversation
{
  "tripId": "trip_123",
  "message": "I want to visit London for 5 days",
  "userId": "user_456"
}
```

Response includes:
- **Processed response** with confirmation flows
- **Slot updates** with normalization status
- **Search triggers** when prerequisites are met
- **Decision audit trail** with turn tokens
- **Deep links** for booking integration

### Retrieve Trip State
```bash
GET /api/database-conversation?tripId=trip_123
```

Returns complete trip state:
- Current slot values and lock status
- Missing slots requiring user input
- Budget allocations and constraints
- Decision history with reasoning
- Available offers and shortlists

### Confirmation Flow
```bash
POST /api/database-conversation
{
  "tripId": "trip_123",
  "message": "yes",
  "confirmationSlot": "destination"
}
```

Locks the confirmed slot and triggers invalidation of dependent data.

## Key Features

### Normalize → Confirm → Lock Pattern
1. **Normalize**: User input is parsed and normalized (e.g., "5 days" → duration constraint)
2. **Confirm**: System asks for confirmation ("You want 5 days, correct?")
3. **Lock**: On "yes", slot is locked and becomes immutable until explicitly changed

### Change Management & Invalidation
When locked fields change, the system automatically:
- Invalidates dependent cached data (hotels, activities, transfers)
- Logs the change with full audit trail
- Triggers fresh searches when prerequisites are met
- Maintains referential integrity across all tables

### Two Routes Rule
Every transfer includes:
- **Primary route**: Optimal path (fastest, cheapest, or most convenient)
- **Backup route**: Alternative with different tradeoffs
- **Full route details**: Legs, duration, costs, and real-time status

### Budget Governance
- **Total budget tracking** with per-day and per-meal allocations
- **Category-wise limits** (accommodation, activities, food, transport)
- **Automatic optimization** when budgets are exceeded
- **Scenario generation** with tradeoff analysis

### Search Prerequisites & Triggers
Searches are automatically triggered when requirements are met:
- **Hotels**: Need destination, check-in, check-out dates
- **Activities**: Need destination and date range
- **Flights**: Need origin, destination, and departure date
- **Restaurants**: Need destination and proximity context

### Geographic Intelligence
- **PostGIS spatial queries** for proximity-based recommendations
- **Hierarchical place resolution** (country → city → neighborhood)
- **Distance calculations** for walkability and convenience scoring
- **Fuzzy text matching** with trigram indexes for place name resolution

## Error Handling & Recovery

### Idempotency
Each conversation turn has a unique token to prevent duplicate operations:
```typescript
const turnToken = `${tripId}_turn_${turnCounter}_${timestamp}`
```

### Transaction Safety
All database operations use proper transaction boundaries to ensure consistency.

### Graceful Degradation
- Database connection failures fall back to in-memory processing
- Individual search failures don't break the conversation flow
- Partial data is handled gracefully with confidence scoring

## Monitoring & Observability

### Decision Logs
Every action is logged with structured metadata:
```sql
INSERT INTO decision_logs(trip_id, event_type, message, meta)
VALUES ('trip_123', 'slot_locked', 'Locked destination', 
        jsonb_build_object('value', 'London', 'confidence', 90));
```

### Health Checks
```bash
HEAD /api/database-conversation
```
Returns 200 if database is healthy, 503 if unhealthy.

### Performance Monitoring
- Query performance tracking
- Cache hit rates
- Search response times
- Turn completion metrics

## Production Considerations

### Scaling
- Connection pooling with configurable pool sizes
- Read replicas for query-heavy operations
- Materialized view refresh strategies
- Search result caching with TTL

### Security
- Parameterized queries prevent SQL injection
- User isolation with proper authorization
- API key management for provider integrations
- Data encryption at rest and in transit

### Backup & Recovery
- Automated database backups
- Point-in-time recovery capabilities
- Decision log archival strategies
- State migration procedures

## Integration Points

### Provider APIs
The system is designed to integrate with real provider APIs:
- **Hotels**: Booking.com, Expedia Partner Solutions
- **Activities**: GetYourGuide, Viator
- **Restaurants**: Zomato, Google Places
- **Flights**: Amadeus, Skyscanner
- **Transport**: Google Maps, local transit APIs

### External Services
- **Geocoding**: For place normalization and coordinates
- **Currency conversion**: For multi-currency budget management
- **Weather APIs**: For activity recommendations
- **Review aggregation**: For quality scoring

This database integration provides a robust foundation for the travel planning bot with full state persistence, audit trails, and scalable architecture.