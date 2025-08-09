-- Postgres schema for a travel-planning bot
-- Focus: robust state (trip brief), normalized places, cached supply (hotels/activities/restaurants/flights),
-- itinerary & transfers, budget governance, searchable logs, and provider request/result tracking.
-- Includes PostGIS for geo queries, pg_trgm for fuzzy matching, and jsonb for flexible provider payloads.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- ENUMS
-- =========================
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'travel_style_enum') THEN
    CREATE TYPE travel_style_enum AS ENUM ('budget','mid_range','luxury','mixed','unspecified');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_name_enum') THEN
    CREATE TYPE slot_name_enum AS ENUM (
      'destination','origin','dates_start','dates_end','travellers','budget_total','budget_daily','travel_style'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'constraint_severity_enum') THEN
    CREATE TYPE constraint_severity_enum AS ENUM ('hard','soft');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_type_enum') THEN
    CREATE TYPE item_type_enum AS ENUM ('hotel','activity','restaurant','flight','transfer','buffer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'domain_enum') THEN
    CREATE TYPE domain_enum AS ENUM ('hotels','activities','restaurants','flights','transport','geocode');
  END IF;
END$;

-- =========================
-- USERS & TRIPS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE,
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  title          TEXT,
  currency       TEXT NOT NULL DEFAULT 'USD',
  status         TEXT NOT NULL DEFAULT 'draft', -- draft | planned | confirmed | archived
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trips_user_id_idx ON trips(user_id);

-- =========================
-- TRIP BRIEF: SLOTS, PREFERENCES, CONSTRAINTS
-- =========================
CREATE TABLE IF NOT EXISTS trip_slots (
  trip_id        UUID REFERENCES trips(id) ON DELETE CASCADE,
  slot_name      slot_name_enum NOT NULL,
  value          JSONB,                    -- canonicalized value (e.g., ISO dates, IATA codes, place ids)
  filled         BOOLEAN NOT NULL DEFAULT FALSE,
  locked         BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, slot_name)
);

CREATE TABLE IF NOT EXISTS trip_preferences (
  trip_id        UUID PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
  travel_style   travel_style_enum NOT NULL DEFAULT 'unspecified',
  dietary        JSONB,                    -- { vegetarian: true, halal: false, allergies: ["nuts"] }
  activity_tastes JSONB,                   -- { themes: ["art","street_food","museums"], intensity: "light" }
  lodging_prefs  JSONB,                    -- { stars_min: 3, stars_max: 4, cancellation: "free_24h" }
  transport_prefs JSONB,                   -- { avoid_red_eye: true, max_transfers: 1, walk_max_minutes: 15 }
  notes          TEXT
);

CREATE TABLE IF NOT EXISTS trip_constraints (
  id             BIGSERIAL PRIMARY KEY,
  trip_id        UUID REFERENCES trips(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,           -- e.g., "must_be_in_city", "no_hostels", "avoid_red_eye_flights"
  severity       constraint_severity_enum NOT NULL DEFAULT 'hard',
  details        JSONB,                   -- structured payload describing the rule
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_constraints_trip_idx ON trip_constraints(trip_id);
CREATE INDEX IF NOT EXISTS trip_slots_trip_idx ON trip_slots(trip_id);

-- =========================
-- PLACES (Normalized, Geocoded)
-- =========================
-- Supports hierarchical place lookups and precise geo filters.
CREATE TABLE IF NOT EXISTS places (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  kind             TEXT NOT NULL,         -- country | region | city | neighborhood | poi | airport | station | address
  country_code     TEXT,
  admin1_code      TEXT,
  admin2_code      TEXT,
  timezone         TEXT,
  geom             GEOGRAPHY(POINT, 4326),-- lon/lat
  parent_place_id  BIGINT REFERENCES places(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS places_geom_gix ON places USING GIST (geom);
CREATE INDEX IF NOT EXISTS places_name_trgm ON places USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS places_kind_idx ON places(kind);

-- =========================
-- PROVIDERS & NORMALIZED SUPPLY CACHES
-- =========================
CREATE TABLE IF NOT EXISTS providers (
  id           BIGSERIAL PRIMARY KEY,
  domain       domain_enum NOT NULL,      -- hotels | activities | ...
  name         TEXT NOT NULL,             -- e.g., "Booking", "Expedia", "Viator", "Amadeus"
  base_url     TEXT,
  auth_kind    TEXT,                      -- oauth2 | token | none
  meta         JSONB
);

-- HOTELS
CREATE TABLE IF NOT EXISTS hotels_cached (
  id                 BIGSERIAL PRIMARY KEY,
  provider_id        BIGINT REFERENCES providers(id) ON DELETE CASCADE,
  provider_hotel_id  TEXT NOT NULL,
  name               TEXT NOT NULL,
  place_id           BIGINT REFERENCES places(id) ON DELETE SET NULL, -- city/neighborhood
  geom               GEOGRAPHY(POINT, 4326),
  stars              NUMERIC(2,1),
  rating             NUMERIC(2,1),
  review_count       INTEGER,
  policies           JSONB,                -- { cancellation: "...", min_stay: 2, deposit: ... }
  amenities          JSONB,                -- [ "wifi", "gym", "breakfast" ]
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, provider_hotel_id)
);

CREATE INDEX IF NOT EXISTS hotels_cached_geom_gix ON hotels_cached USING GIST (geom);
CREATE INDEX IF NOT EXISTS hotels_cached_place_idx ON hotels_cached(place_id);
CREATE INDEX IF NOT EXISTS hotels_cached_name_trgm ON hotels_cached USING GIN (name gin_trgm_ops);

-- ACTIVITIES
CREATE TABLE IF NOT EXISTS activities_cached (
  id                 BIGSERIAL PRIMARY KEY,
  provider_id        BIGINT REFERENCES providers(id) ON DELETE CASCADE,
  provider_activity_id TEXT NOT NULL,
  name               TEXT NOT NULL,
  place_id           BIGINT REFERENCES places(id) ON DELETE SET NULL,
  geom               GEOGRAPHY(POINT, 4326),
  categories         JSONB,               -- ["museum","food","tour"]
  rating             NUMERIC(2,1),
  review_count       INTEGER,
  duration_minutes   INTEGER,
  policy             JSONB,               -- cancellation, age limits, etc.
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_id, provider_activity_id)
);

CREATE INDEX IF NOT EXISTS activities_cached_geom_gix ON activities_cached USING GIST (geom);
CREATE INDEX IF NOT EXISTS activities_cached_place_idx ON activities_cached(place_id);
CREATE INDEX IF NOT EXISTS activities_cached_name_trgm ON activities_cached USING GIN (name gin_trgm_ops);

-- RESTAURANTS
CREATE TABLE IF NOT EXISTS restaurants_cached (
  id                 BIGSERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  place_id           BIGINT REFERENCES places(id) ON DELETE SET NULL,
  geom               GEOGRAPHY(POINT, 4326),
  price_level        INTEGER,             -- 1..4
  cuisines           JSONB,               -- ["italian","thai"]
  dietary_tags       JSONB,               -- ["vegetarian","halal","gluten_free"]
  rating             NUMERIC(2,1),
  review_count       INTEGER,
  hours              JSONB,               -- { mon: [ "08:00-14:00", "17:00-22:00" ], ... }
  source_meta        JSONB,               -- attribution
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS restaurants_cached_geom_gix ON restaurants_cached USING GIST (geom);
CREATE INDEX IF NOT EXISTS restaurants_cached_place_idx ON restaurants_cached(place_id);
CREATE INDEX IF NOT EXISTS restaurants_cached_name_trgm ON restaurants_cached USING GIN (name gin_trgm_ops);

-- FLIGHTS (offers are per-trip; airports are places with kind='airport')
CREATE TABLE IF NOT EXISTS flight_offers (
  id                 BIGSERIAL PRIMARY KEY,
  trip_id            UUID REFERENCES trips(id) ON DELETE CASCADE,
  provider_id        BIGINT REFERENCES providers(id) ON DELETE SET NULL,
  query_hash         TEXT,                -- hash of params for invalidation
  origin_airport_id  BIGINT REFERENCES places(id) ON DELETE SET NULL,
  dest_airport_id    BIGINT REFERENCES places(id) ON DELETE SET NULL,
  depart_at          TIMESTAMPTZ,
  arrive_at          TIMESTAMPTZ,
  total_price_cents  BIGINT,
  currency           TEXT,
  stops              INTEGER,
  slices             JSONB,               -- [{carrier:"BA", flight:"BA123", depart:"...", arrive:"...", from:"LHR", to:"JFK"}...]
  fare_meta          JSONB,               -- baggage, fare_class, rules
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flight_offers_trip_idx ON flight_offers(trip_id);
CREATE INDEX IF NOT EXISTS flight_offers_price_idx ON flight_offers(total_price_cents);

-- =========================
-- SEARCH REQUESTS/RESULTS (for auditing & caching)
-- =========================
CREATE TABLE IF NOT EXISTS search_requests (
  id             BIGSERIAL PRIMARY KEY,
  trip_id        UUID REFERENCES trips(id) ON DELETE CASCADE,
  domain         domain_enum NOT NULL,
  params         JSONB NOT NULL,
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_hash   TEXT
);

CREATE INDEX IF NOT EXISTS search_requests_trip_idx ON search_requests(trip_id);
CREATE INDEX IF NOT EXISTS search_requests_hash_idx ON search_requests(request_hash);

CREATE TABLE IF NOT EXISTS search_results (
  id             BIGSERIAL PRIMARY KEY,
  request_id     BIGINT REFERENCES search_requests(id) ON DELETE CASCADE,
  item_type      item_type_enum NOT NULL,
  item_ref_id    BIGINT,                  -- e.g., hotels_cached.id or activities_cached.id
  score          NUMERIC(6,3),
  snapshot       JSONB,                   -- denormalized snapshot for reproducibility
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_results_request_idx ON search_results(request_id);
CREATE INDEX IF NOT EXISTS search_results_score_idx ON search_results(score);

-- =========================
-- PER-TRIP OFFERS/SHORTLISTS (after constraint filtering & scoring)
-- =========================
CREATE TABLE IF NOT EXISTS hotel_offers (
  id                 BIGSERIAL PRIMARY KEY,
  trip_id            UUID REFERENCES trips(id) ON DELETE CASCADE,
  hotels_cached_id   BIGINT REFERENCES hotels_cached(id) ON DELETE CASCADE,
  provider_id        BIGINT REFERENCES providers(id) ON DELETE SET NULL,
  checkin            DATE,
  checkout           DATE,
  guests             INTEGER,
  rooms_json         JSONB,               -- room config from provider
  total_price_cents  BIGINT,
  currency           TEXT,
  availability       BOOLEAN NOT NULL DEFAULT TRUE,
  distance_meters    INTEGER,
  policies           JSONB,
  score_breakdown    JSONB,               -- { price: X, location: Y, reviews: Z, policy: W, total: T }
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hotel_offers_trip_idx ON hotel_offers(trip_id);
CREATE INDEX IF NOT EXISTS hotel_offers_price_idx ON hotel_offers(total_price_cents);

CREATE TABLE IF NOT EXISTS activity_offers (
  id                 BIGSERIAL PRIMARY KEY,
  trip_id            UUID REFERENCES trips(id) ON DELETE CASCADE,
  activities_cached_id BIGINT REFERENCES activities_cached(id) ON DELETE CASCADE,
  provider_id        BIGINT REFERENCES providers(id) ON DELETE SET NULL,
  activity_date      DATE,
  price_cents        BIGINT,
  currency           TEXT,
  slots_json         JSONB,               -- time slots
  availability       BOOLEAN NOT NULL DEFAULT TRUE,
  distance_meters    INTEGER,
  score_breakdown    JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_offers_trip_idx ON activity_offers(trip_id);
CREATE INDEX IF NOT EXISTS activity_offers_price_idx ON activity_offers(price_cents);

-- =========================
-- ITINERARY, DAYS & ITEMS (with geo & cost)
-- =========================
CREATE TABLE IF NOT EXISTS itineraries (
  id             BIGSERIAL PRIMARY KEY,
  trip_id        UUID REFERENCES trips(id) ON DELETE CASCADE,
  version        INTEGER NOT NULL DEFAULT 1,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS itineraries_trip_active_uidx ON itineraries(trip_id, active) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS itinerary_days (
  id             BIGSERIAL PRIMARY KEY,
  itinerary_id   BIGINT REFERENCES itineraries(id) ON DELETE CASCADE,
  day_date       DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS itinerary_days_itin_idx ON itinerary_days(itinerary_id);

CREATE TABLE IF NOT EXISTS itinerary_items (
  id             BIGSERIAL PRIMARY KEY,
  day_id         BIGINT REFERENCES itinerary_days(id) ON DELETE CASCADE,
  item_type      item_type_enum NOT NULL,
  ref_table      TEXT,                    -- 'hotel_offers' | 'activity_offers' | 'restaurants_cached' | 'flight_offers' | NULL
  ref_id         BIGINT,                  -- id in the ref_table
  name           TEXT,                    -- denormalized label
  start_time     TIMESTAMPTZ,
  end_time       TIMESTAMPTZ,
  cost_cents     BIGINT,
  currency       TEXT,
  location       GEOGRAPHY(POINT, 4326),
  meta           JSONB,                   -- any extra details
  position       INTEGER                  -- order within the day
);

CREATE INDEX IF NOT EXISTS itinerary_items_day_idx ON itinerary_items(day_id);
CREATE INDEX IF NOT EXISTS itinerary_items_loc_gix ON itinerary_items USING GIST (location);

-- =========================
-- TRANSFERS (Primary & Backup routes for every hop)
-- =========================
CREATE TABLE IF NOT EXISTS transfers (
  id             BIGSERIAL PRIMARY KEY,
  trip_id        UUID REFERENCES trips(id) ON DELETE CASCADE,
  from_place_id  BIGINT REFERENCES places(id) ON DELETE SET NULL,
  to_place_id    BIGINT REFERENCES places(id) ON DELETE SET NULL,
  depart_at      TIMESTAMPTZ,
  arrive_by      TIMESTAMPTZ,
  primary_route  JSONB,                   -- { legs:[{mode:'walk/train/bus/taxi', from, to, duration_min, cost_cents }], total_time, total_cost }
  backup_route   JSONB,                   -- same structure as primary
  notes          JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transfers_trip_idx ON transfers(trip_id);

-- =========================
-- BUDGET & ALLOCATIONS
-- =========================
CREATE TABLE IF NOT EXISTS budgets (
  trip_id            UUID PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
  currency           TEXT NOT NULL,
  total_budget_cents BIGINT,
  per_day_cents      BIGINT,
  per_meal_cents     BIGINT,
  allocations        JSONB                -- { flights:..., lodging:..., activities:..., food:..., local_transport:... }
);

-- =========================
-- LOGS & DECISION TRACEABILITY
-- =========================
CREATE TABLE IF NOT EXISTS decision_logs (
  id             BIGSERIAL PRIMARY KEY,
  trip_id        UUID REFERENCES trips(id) ON DELETE CASCADE,
  event_type     TEXT NOT NULL,           -- 'slot_filled','slot_locked','search_run','offer_selected','constraint_violation','refresh'
  message        TEXT NOT NULL,
  meta           JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS decision_logs_trip_idx ON decision_logs(trip_id);
CREATE INDEX IF NOT EXISTS decision_logs_event_idx ON decision_logs(event_type);

-- =========================
-- VIEWS (Convenience)
-- =========================
CREATE OR REPLACE VIEW v_trip_summary AS
SELECT
  t.id AS trip_id,
  t.user_id,
  t.status,
  t.currency,
  (SELECT value->>'value' FROM (
    SELECT (value #>> '{}') AS value FROM trip_slots WHERE trip_id=t.id AND slot_name='destination'
  ) s) AS destination_raw,
  (SELECT value->>'value' FROM (
    SELECT (value #>> '{}') AS value FROM trip_slots WHERE trip_id=t.id AND slot_name='origin'
  ) s) AS origin_raw,
  (SELECT value->>'iso' FROM (
    SELECT (value #>> '{}') AS value FROM trip_slots WHERE trip_id=t.id AND slot_name='dates_start'
  ) s) AS start_iso,
  (SELECT value->>'iso' FROM (
    SELECT (value #>> '{}') AS value FROM trip_slots WHERE trip_id=t.id AND slot_name='dates_end'
  ) s) AS end_iso,
  (SELECT travel_style FROM trip_preferences WHERE trip_id=t.id) AS travel_style,
  (SELECT total_budget_cents FROM budgets WHERE trip_id=t.id) AS total_budget_cents,
  t.created_at, t.updated_at
FROM trips t;

CREATE OR REPLACE VIEW v_next_missing_slot AS
SELECT
  ts.trip_id,
  ARRAY_AGG(slot_name ORDER BY slot_name)::slot_name_enum[] AS missing_slots
FROM trip_slots ts
WHERE filled = FALSE OR locked = FALSE
GROUP BY ts.trip_id;

-- =========================
-- SAMPLE INDEXES FOR PERFORMANCE
-- =========================
CREATE INDEX IF NOT EXISTS trip_slots_name_filled_idx ON trip_slots(trip_id, slot_name) WHERE filled = TRUE;
CREATE INDEX IF NOT EXISTS hotel_offers_scoring_gin ON hotel_offers USING GIN (score_breakdown);
CREATE INDEX IF NOT EXISTS activity_offers_scoring_gin ON activity_offers USING GIN (score_breakdown);
CREATE INDEX IF NOT EXISTS restaurants_cached_cuisine_gin ON restaurants_cached USING GIN (cuisines);
CREATE INDEX IF NOT EXISTS restaurants_cached_diet_gin ON restaurants_cached USING GIN (dietary_tags);

-- =========================
-- SIMPLE DATA INTEGRITY TRIGGERS (timestamps)
-- =========================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trips_updated ON trips;
CREATE TRIGGER trg_trips_updated BEFORE UPDATE ON trips
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- EXAMPLE: MATERIALIZED VIEW to join hotel offers with geo & reviews (fast shortlist rendering)
-- =========================
DROP MATERIALIZED VIEW IF EXISTS mv_hotel_shortlist;
CREATE MATERIALIZED VIEW mv_hotel_shortlist AS
SELECT
  ho.id AS hotel_offer_id,
  ho.trip_id,
  hc.name,
  hc.stars,
  hc.rating,
  hc.review_count,
  ho.total_price_cents,
  ho.currency,
  ho.checkin,
  ho.checkout,
  ho.distance_meters,
  hc.geom
FROM hotel_offers ho
JOIN hotels_cached hc ON hc.id = ho.hotels_cached_id;

CREATE INDEX IF NOT EXISTS mv_hotel_shortlist_trip_idx ON mv_hotel_shortlist(trip_id);
CREATE INDEX IF NOT EXISTS mv_hotel_shortlist_geom_gix ON mv_hotel_shortlist USING GIST (geom);

-- =========================
-- SEED EXAMPLES (optional)
-- =========================
-- INSERT INTO providers(domain,name) VALUES
-- ('hotels','Booking'),('hotels','Expedia'),('activities','Viator'),('flights','Amadeus');

-- Insert a sample city
-- INSERT INTO places(name,kind,country_code,geom,timezone) VALUES
-- ('New York','city','US', ST_GeogFromText('SRID=4326;POINT(-74.0060 40.7128)'), 'America/New_York');