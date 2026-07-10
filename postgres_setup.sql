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
