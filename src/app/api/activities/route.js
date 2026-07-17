import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ACTIVITY_VISIBILITIES } from '@/lib/activities';
import { db } from '@/lib/pg';

const MAX_ROUTE_POINTS = 10000;

function validNumber(value, min = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min ? number : null;
}

function validRoute(route) {
  if (route == null) return null;
  if (route.type !== 'LineString' || !Array.isArray(route.coordinates) || route.coordinates.length > MAX_ROUTE_POINTS) return undefined;
  const coordinates = route.coordinates.filter(point => (
    Array.isArray(point)
    && point.length >= 2
    && Number.isFinite(point[0])
    && Number.isFinite(point[1])
    && point[0] >= -180 && point[0] <= 180
    && point[1] >= -90 && point[1] <= 90
  ));
  return coordinates.length === route.coordinates.length && coordinates.length >= 2
    ? { type: 'LineString', coordinates }
    : undefined;
}

async function userSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? session : null;
}

export async function GET() {
  const session = await userSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Activity sync is not configured' }, { status: 503 });
  try {
    const result = await db.query(`
      SELECT id, activity_type AS type, title, trail_id, trail_name, started_at, completed_at,
        duration_seconds, distance_meters, elevation_gain_meters, average_pace_seconds_per_mile,
        notes, visibility, hide_start_end, route_geojson AS route, updated_at
      FROM user_activities
      WHERE user_id = $1
      ORDER BY completed_at DESC
      LIMIT 250
    `, [session.user.id]);
    return NextResponse.json({ activities: result.rows });
  } catch (error) {
    console.error('Activity list error:', error);
    return NextResponse.json({ error: 'Activity sync is temporarily unavailable' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await userSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Activity sync is not configured' }, { status: 503 });

  let activity;
  try {
    activity = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const route = validRoute(activity?.route);
  const duration = validNumber(activity?.durationSeconds);
  const distance = validNumber(activity?.distanceMeters);
  const elevation = validNumber(activity?.elevationGainMeters);
  const pace = validNumber(activity?.averagePaceSecondsPerMile);
  const startedAt = validNumber(activity?.startedAt, 1);
  const completedAt = validNumber(activity?.completedAt, 1);
  if (!activity?.id || !String(activity.title || '').trim() || route === undefined
    || [duration, distance, elevation, pace, startedAt, completedAt].includes(null)
    || completedAt < startedAt || !ACTIVITY_VISIBILITIES.includes(activity.visibility)) {
    return NextResponse.json({ error: 'Invalid activity' }, { status: 400 });
  }

  try {
    await db.query(`
      INSERT INTO user_activities (
        id, user_id, activity_type, title, trail_id, trail_name, started_at, completed_at,
        duration_seconds, distance_meters, elevation_gain_meters, average_pace_seconds_per_mile,
        notes, visibility, hide_start_end, route_geojson, updated_at
      ) VALUES ($1, $2, 'hike', $3, $4, $5, to_timestamp($6 / 1000.0), to_timestamp($7 / 1000.0),
        $8, $9, $10, $11, $12, $13, $14, $15::jsonb, now())
      ON CONFLICT (id, user_id) DO UPDATE SET
        title = EXCLUDED.title,
        trail_id = EXCLUDED.trail_id,
        trail_name = EXCLUDED.trail_name,
        started_at = EXCLUDED.started_at,
        completed_at = EXCLUDED.completed_at,
        duration_seconds = EXCLUDED.duration_seconds,
        distance_meters = EXCLUDED.distance_meters,
        elevation_gain_meters = EXCLUDED.elevation_gain_meters,
        average_pace_seconds_per_mile = EXCLUDED.average_pace_seconds_per_mile,
        notes = EXCLUDED.notes,
        visibility = EXCLUDED.visibility,
        hide_start_end = EXCLUDED.hide_start_end,
        route_geojson = EXCLUDED.route_geojson,
        updated_at = now()
    `, [
      String(activity.id).slice(0, 100), session.user.id, String(activity.title).trim().slice(0, 100),
      activity.trailId ? String(activity.trailId).slice(0, 100) : null,
      activity.trailName ? String(activity.trailName).slice(0, 160) : null,
      startedAt, completedAt, Math.round(duration), distance, elevation, Math.round(pace),
      String(activity.notes || '').trim().slice(0, 2000), activity.visibility, activity.hideStartEnd !== false,
      route ? JSON.stringify(route) : null,
    ]);
    return NextResponse.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Activity sync error:', error);
    return NextResponse.json({ error: 'Activity sync is temporarily unavailable' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await userSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Activity sync is not configured' }, { status: 503 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
  try {
    await db.query('DELETE FROM user_activities WHERE id = $1 AND user_id = $2', [id, session.user.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Activity delete error:', error);
    return NextResponse.json({ error: 'Activity sync is temporarily unavailable' }, { status: 500 });
  }
}
