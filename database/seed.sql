-- Seed data for travel agent database
-- Sample providers, places, and cached supply data

-- Insert sample providers
INSERT INTO providers(domain, name, base_url, auth_kind, meta) VALUES
('hotels', 'Booking.com', 'https://distribution-xml.booking.com/xml/booking', 'token', '{"priority": 90}'),
('hotels', 'Expedia', 'https://api.ean.com', 'oauth2', '{"priority": 85}'),
('activities', 'GetYourGuide', 'https://api.getyourguide.com', 'token', '{"priority": 85}'),
('activities', 'Viator', 'https://api.viator.com', 'token', '{"priority": 80}'),
('restaurants', 'Zomato', 'https://api.zomato.com', 'token', '{"priority": 75}'),
('flights', 'Amadeus', 'https://api.amadeus.com', 'oauth2', '{"priority": 95}'),
('flights', 'Skyscanner', 'https://partners.api.skyscanner.net', 'token', '{"priority": 90}'),
('transport', 'Google Maps', 'https://maps.googleapis.com/maps/api', 'token', '{"priority": 90}');

-- Insert sample places with PostGIS geometry
INSERT INTO places(name, kind, country_code, admin1_code, timezone, geom) VALUES
-- Major cities
('London', 'city', 'GB', 'ENG', 'Europe/London', ST_GeogFromText('SRID=4326;POINT(-0.1278 51.5074)')),
('Paris', 'city', 'FR', 'IDF', 'Europe/Paris', ST_GeogFromText('SRID=4326;POINT(2.3522 48.8566)')),
('Rome', 'city', 'IT', 'LAZ', 'Europe/Rome', ST_GeogFromText('SRID=4326;POINT(12.4964 41.9028)')),
('New York', 'city', 'US', 'NY', 'America/New_York', ST_GeogFromText('SRID=4326;POINT(-74.0060 40.7128)')),
('Tokyo', 'city', 'JP', '13', 'Asia/Tokyo', ST_GeogFromText('SRID=4326;POINT(139.6917 35.6895)')),
('Barcelona', 'city', 'ES', 'CT', 'Europe/Madrid', ST_GeogFromText('SRID=4326;POINT(2.1734 41.3851)')),
('Amsterdam', 'city', 'NL', 'NH', 'Europe/Amsterdam', ST_GeogFromText('SRID=4326;POINT(4.9041 52.3676)')),
('Berlin', 'city', 'DE', 'BE', 'Europe/Berlin', ST_GeogFromText('SRID=4326;POINT(13.4050 52.5200)')),

-- Airports
('Heathrow Airport', 'airport', 'GB', 'ENG', 'Europe/London', ST_GeogFromText('SRID=4326;POINT(-0.4614 51.4700)')),
('Charles de Gaulle Airport', 'airport', 'FR', 'IDF', 'Europe/Paris', ST_GeogFromText('SRID=4326;POINT(2.5500 49.0097)')),
('Leonardo da Vinci Airport', 'airport', 'IT', 'LAZ', 'Europe/Rome', ST_GeogFromText('SRID=4326;POINT(12.2389 41.8003)')),
('JFK Airport', 'airport', 'US', 'NY', 'America/New_York', ST_GeogFromText('SRID=4326;POINT(-73.7781 40.6413)')),
('Narita Airport', 'airport', 'JP', '13', 'Asia/Tokyo', ST_GeogFromText('SRID=4326;POINT(140.3869 35.7720)')),

-- Countries
('United Kingdom', 'country', 'GB', NULL, 'Europe/London', ST_GeogFromText('SRID=4326;POINT(-2.0 54.0)')),
('France', 'country', 'FR', NULL, 'Europe/Paris', ST_GeogFromText('SRID=4326;POINT(2.0 46.0)')),
('Italy', 'country', 'IT', NULL, 'Europe/Rome', ST_GeogFromText('SRID=4326;POINT(12.0 42.0)')),
('United States', 'country', 'US', NULL, 'America/New_York', ST_GeogFromText('SRID=4326;POINT(-95.0 37.0)')),
('Japan', 'country', 'JP', NULL, 'Asia/Tokyo', ST_GeogFromText('SRID=4326;POINT(138.0 36.0)'));

-- Update places with parent relationships
UPDATE places SET parent_place_id = (SELECT id FROM places WHERE name = 'United Kingdom' AND kind = 'country') 
WHERE name IN ('London', 'Heathrow Airport') AND kind != 'country';

UPDATE places SET parent_place_id = (SELECT id FROM places WHERE name = 'France' AND kind = 'country') 
WHERE name IN ('Paris', 'Charles de Gaulle Airport') AND kind != 'country';

UPDATE places SET parent_place_id = (SELECT id FROM places WHERE name = 'Italy' AND kind = 'country') 
WHERE name IN ('Rome', 'Leonardo da Vinci Airport') AND kind != 'country';

UPDATE places SET parent_place_id = (SELECT id FROM places WHERE name = 'United States' AND kind = 'country') 
WHERE name IN ('New York', 'JFK Airport') AND kind != 'country';

UPDATE places SET parent_place_id = (SELECT id FROM places WHERE name = 'Japan' AND kind = 'country') 
WHERE name IN ('Tokyo', 'Narita Airport') AND kind != 'country';

-- Insert sample cached hotels
INSERT INTO hotels_cached(provider_id, provider_hotel_id, name, place_id, geom, stars, rating, review_count, policies, amenities) VALUES
-- London hotels
((SELECT id FROM providers WHERE name = 'Booking.com'), 'book_london_001', 'The London Central Hotel', 
 (SELECT id FROM places WHERE name = 'London'), ST_GeogFromText('SRID=4326;POINT(-0.1200 51.5100)'), 
 4.0, 8.2, 1247, '{"cancellation": "free_24h", "deposit": false}', '["WiFi", "Gym", "Restaurant", "Concierge"]'),

((SELECT id FROM providers WHERE name = 'Expedia'), 'exp_london_001', 'Premier London Suites', 
 (SELECT id FROM places WHERE name = 'London'), ST_GeogFromText('SRID=4326;POINT(-0.1250 51.5080)'), 
 4.5, 8.8, 892, '{"cancellation": "free_48h", "deposit": true}', '["WiFi", "Spa", "Restaurant", "Business Center"]'),

-- Paris hotels
((SELECT id FROM providers WHERE name = 'Booking.com'), 'book_paris_001', 'Hotel de la Paix Paris', 
 (SELECT id FROM places WHERE name = 'Paris'), ST_GeogFromText('SRID=4326;POINT(2.3400 48.8600)'), 
 3.5, 7.9, 654, '{"cancellation": "free_24h", "deposit": false}', '["WiFi", "Restaurant", "Parking"]'),

-- Rome hotels
((SELECT id FROM providers WHERE name = 'Booking.com'), 'book_rome_001', 'Roma Centro Hotel', 
 (SELECT id FROM places WHERE name = 'Rome'), ST_GeogFromText('SRID=4326;POINT(12.4900 41.9000)'), 
 4.0, 8.1, 1156, '{"cancellation": "free_24h", "deposit": false}', '["WiFi", "Restaurant", "Rooftop Terrace"]');

-- Insert sample cached activities
INSERT INTO activities_cached(provider_id, provider_activity_id, name, place_id, geom, categories, rating, review_count, duration_minutes, policy) VALUES
-- London activities
((SELECT id FROM providers WHERE name = 'GetYourGuide'), 'gyg_london_001', 'London Historical Walking Tour', 
 (SELECT id FROM places WHERE name = 'London'), ST_GeogFromText('SRID=4326;POINT(-0.1276 51.5081)'), 
 '["history", "walking", "culture"]', 4.7, 892, 180, '{"cancellation": "free_24h", "age_min": 8}'),

((SELECT id FROM providers WHERE name = 'Viator'), 'via_london_001', 'Thames River Cruise', 
 (SELECT id FROM places WHERE name = 'London'), ST_GeogFromText('SRID=4326;POINT(-0.1195 51.5033)'), 
 '["sightseeing", "water", "relaxing"]', 4.5, 1456, 90, '{"cancellation": "free_24h", "age_min": 0}'),

-- Paris activities
((SELECT id FROM providers WHERE name = 'GetYourGuide'), 'gyg_paris_001', 'Louvre Museum Skip-the-Line Tour', 
 (SELECT id FROM places WHERE name = 'Paris'), ST_GeogFromText('SRID=4326;POINT(2.3376 48.8606)'), 
 '["museum", "art", "culture"]', 4.8, 2134, 120, '{"cancellation": "free_48h", "age_min": 6}'),

-- Rome activities
((SELECT id FROM providers WHERE name = 'GetYourGuide'), 'gyg_rome_001', 'Colosseum and Forum Tour', 
 (SELECT id FROM places WHERE name = 'Rome'), ST_GeogFromText('SRID=4326;POINT(12.4924 41.8902)'), 
 '["history", "ancient", "walking"]', 4.6, 3247, 150, '{"cancellation": "free_24h", "age_min": 8}');

-- Insert sample restaurants
INSERT INTO restaurants_cached(name, place_id, geom, price_level, cuisines, dietary_tags, rating, review_count, hours, source_meta) VALUES
-- London restaurants
('The London Bistro', (SELECT id FROM places WHERE name = 'London'), ST_GeogFromText('SRID=4326;POINT(-0.1280 51.5090)'), 
 2, '["british", "european"]', '["vegetarian"]', 4.3, 567, 
 '{"mon": ["12:00-15:00", "18:00-23:00"], "tue": ["12:00-15:00", "18:00-23:00"]}', '{"source": "manual", "verified": true}'),

('Curry Palace London', (SELECT id FROM places WHERE name = 'London'), ST_GeogFromText('SRID=4326;POINT(-0.1290 51.5095)'), 
 2, '["indian", "curry"]', '["vegetarian", "vegan", "halal"]', 4.1, 892, 
 '{"mon": ["17:00-23:00"], "tue": ["17:00-23:00"]}', '{"source": "manual", "verified": true}'),

-- Paris restaurants
('Café de la Seine', (SELECT id FROM places WHERE name = 'Paris'), ST_GeogFromText('SRID=4326;POINT(2.3450 48.8570)'), 
 2, '["french", "cafe"]', '["vegetarian"]', 4.4, 234, 
 '{"mon": ["08:00-18:00"], "tue": ["08:00-18:00"]}', '{"source": "manual", "verified": true}'),

-- Rome restaurants
('Trattoria Roma Antica', (SELECT id FROM places WHERE name = 'Rome'), ST_GeogFromText('SRID=4326;POINT(12.4950 41.9010)'), 
 3, '["italian", "pizza", "pasta"]', '["vegetarian"]', 4.5, 1123, 
 '{"mon": ["12:00-15:00", "19:00-23:00"], "tue": ["12:00-15:00", "19:00-23:00"]}', '{"source": "manual", "verified": true}');

-- Create a sample user and trip for testing
INSERT INTO users(email, display_name) VALUES
('test@travelagent.com', 'Test User');

-- Refresh materialized view
REFRESH MATERIALIZED VIEW mv_hotel_shortlist;

-- Sample data summary
SELECT 
    'Sample data loaded successfully!' as status,
    (SELECT COUNT(*) FROM providers) as providers_count,
    (SELECT COUNT(*) FROM places) as places_count,
    (SELECT COUNT(*) FROM hotels_cached) as hotels_count,
    (SELECT COUNT(*) FROM activities_cached) as activities_count,
    (SELECT COUNT(*) FROM restaurants_cached) as restaurants_count,
    (SELECT COUNT(*) FROM users) as users_count;