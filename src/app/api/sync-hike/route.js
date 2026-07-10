import { NextResponse } from 'next/server';
import { db } from '../../../lib/pg';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // We expect { id, userId, hikeName, distanceMeters, durationSeconds, elevationGainMeters, path }
    // path is an array of [lng, lat] coordinates

    let geomSql = 'NULL';
    let values = [
      data.id, 
      data.userId, 
      data.hikeName, 
      data.distanceMeters, 
      data.durationSeconds, 
      data.elevationGainMeters
    ];

    if (data.path && data.path.length >= 2) {
      // Build a LineString
      const coordinates = data.path.map(pt => `${pt[0]} ${pt[1]}`).join(', ');
      geomSql = `ST_GeomFromText('LINESTRING(${coordinates})', 4326)`;
    }

    const query = `
      INSERT INTO user_hike_logs (
        id, user_id, hike_name, distance_meters, duration_seconds, elevation_gain_meters, gps_path
      ) VALUES (
        $1, $2, $3, $4, $5, $6, ${geomSql}
      )
      ON CONFLICT (id) DO UPDATE SET
        distance_meters = EXCLUDED.distance_meters,
        duration_seconds = EXCLUDED.duration_seconds,
        elevation_gain_meters = EXCLUDED.elevation_gain_meters,
        gps_path = EXCLUDED.gps_path,
        synced_at = timezone('utc'::text, now());
    `;

    await db.query(query, values);

    return NextResponse.json({ success: true, message: 'Hike synced successfully' });
  } catch (error) {
    console.error('Hike sync failed:', error);
    return NextResponse.json({ error: 'Failed to sync hike', details: error.message }, { status: 500 });
  }
}
