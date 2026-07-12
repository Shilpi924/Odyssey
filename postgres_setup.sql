-- 1. Enable the PostGIS extension (required for geometry types)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create the trails table
CREATE TABLE IF NOT EXISTS trails (
  id TEXT PRIMARY KEY,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  geom GEOMETRY(LineString, 4326),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create a spatial index for faster geographic queries
CREATE INDEX IF NOT EXISTS trails_geom_idx ON trails USING GIST (geom);

-- 4. Create user preferences table for personalization
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  preferences JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create user hike logs table to store synced hikes
CREATE TABLE IF NOT EXISTS user_hike_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  hike_name TEXT NOT NULL,
  distance_meters FLOAT NOT NULL,
  duration_seconds INT NOT NULL,
  elevation_gain_meters FLOAT NOT NULL,
  gps_path GEOMETRY(LineString, 4326),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create reviews table for user ratings and reviews
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  trail_id TEXT NOT NULL,
  trail_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create index for faster review queries
CREATE INDEX IF NOT EXISTS reviews_trail_id_idx ON reviews(trail_id);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON reviews(user_id);
CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews(created_at DESC);

-- 8. Phase 2 canonical park catalog. Boundary geometry is stored separately
-- from display metadata so official NPS MultiPolygons can replace pilot search envelopes.
CREATE TABLE IF NOT EXISTS trail_parks (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  park_code TEXT,
  state TEXT,
  country_code TEXT NOT NULL,
  center GEOGRAPHY(Point, 4326),
  boundary GEOGRAPHY(MultiPolygon, 4326),
  boundary_authority TEXT NOT NULL DEFAULT 'search-envelope',
  source JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS trail_parks_boundary_idx ON trail_parks USING GIST (boundary);

-- 9. Canonical trail catalog. JSONB preserves the versioned application schema;
-- indexed columns support fast park and geographic candidate retrieval.
CREATE TABLE IF NOT EXISTS trail_catalog (
  id TEXT PRIMARY KEY,
  schema_version INT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  park_id TEXT REFERENCES trail_parks(id),
  trailhead GEOGRAPHY(Point, 4326) NOT NULL,
  route_geometry GEOGRAPHY(Geometry, 4326),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Moderate', 'Hard', 'Strenuous')),
  access_status TEXT NOT NULL CHECK (access_status IN ('Open', 'Caution', 'Closed', 'Unknown')),
  record JSONB NOT NULL,
  source_provider TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS trail_catalog_park_idx ON trail_catalog(park_id);
CREATE INDEX IF NOT EXISTS trail_catalog_trailhead_idx ON trail_catalog USING GIST (trailhead);
CREATE INDEX IF NOT EXISTS trail_catalog_route_idx ON trail_catalog USING GIST (route_geometry);
CREATE INDEX IF NOT EXISTS trail_catalog_name_idx ON trail_catalog USING GIN (to_tsvector('english', name));

-- 10. Import and moderation foundations. Human review at scale is deferred,
-- but every automated import can be audited and conflicts cannot silently publish.
CREATE TABLE IF NOT EXISTS catalog_import_runs (
  id TEXT PRIMARY KEY,
  source_provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  records_seen INT NOT NULL DEFAULT 0,
  records_published INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS catalog_conflicts (
  id TEXT PRIMARY KEY,
  trail_id TEXT,
  conflict_type TEXT NOT NULL,
  candidate_record JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Minimal relevance feedback for future ranking evaluation. This is not
-- treated as verified community trail data.
CREATE TABLE IF NOT EXISTS search_relevance_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  query TEXT NOT NULL,
  trail_id TEXT NOT NULL,
  position INT NOT NULL,
  relevant BOOLEAN NOT NULL,
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS search_feedback_query_idx ON search_relevance_feedback(query);
CREATE INDEX IF NOT EXISTS search_feedback_trail_idx ON search_relevance_feedback(trail_id);
