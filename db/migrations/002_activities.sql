CREATE TABLE IF NOT EXISTS user_activities (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'hike' CHECK (activity_type IN ('hike')),
  title TEXT NOT NULL,
  trail_id TEXT,
  trail_name TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INT NOT NULL CHECK (duration_seconds >= 0),
  distance_meters DOUBLE PRECISION NOT NULL CHECK (distance_meters >= 0),
  elevation_gain_meters DOUBLE PRECISION NOT NULL CHECK (elevation_gain_meters >= 0),
  average_pace_seconds_per_mile INT NOT NULL CHECK (average_pace_seconds_per_mile >= 0),
  notes TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'followers', 'public')),
  hide_start_end BOOLEAN NOT NULL DEFAULT true,
  route_geojson JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id, user_id)
);

CREATE INDEX IF NOT EXISTS user_activities_user_completed_idx
  ON user_activities(user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS user_activities_trail_idx
  ON user_activities(trail_id);
