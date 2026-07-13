import { NextResponse } from 'next/server';
import { getTrailById } from '@/lib/trails/catalog';
import { geometryDistanceMiles } from '@/lib/trails/geometry';
import { fetchOsmRelationGeometry } from '@/lib/trails/providers';

export async function GET(request, context) {
  const { id } = await context.params;
  const trail = getTrailById(id);
  if (!trail) return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
  const relationId = trail.source.geometry?.relationId;
  if (!relationId) return NextResponse.json({ error: 'Verified route geometry is not available' }, { status: 404 });
  try {
    const geometry = await fetchOsmRelationGeometry(relationId);
    return NextResponse.json({
      trailId: trail.id,
      geometry,
      distanceMiles: Number(geometryDistanceMiles(geometry).toFixed(2)),
      elevation: null,
      source: trail.source.geometry,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
