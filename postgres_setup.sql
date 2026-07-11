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
