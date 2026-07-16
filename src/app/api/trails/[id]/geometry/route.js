import { NextResponse } from 'next/server';
import { getTrailById } from '@/lib/trails/catalog';
import { geometryDistanceMiles } from '@/lib/trails/geometry';
import { fetchCaliforniaStateParksTrailGeometry, fetchOsmRelationGeometry } from '@/lib/trails/providers';

export async function GET(request, context) {
  const { id } = await context.params;
  const trail = getTrailById(id);
  if (!trail) return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
  const geometrySource = trail.source.geometry;
  if (!geometrySource) return NextResponse.json({ error: 'Verified route geometry is not available' }, { status: 404 });
  try {
    const geometry = geometrySource.provider === 'osm'
      ? await fetchOsmRelationGeometry(geometrySource.relationId)
      : geometrySource.provider === 'ca-state-parks-arcgis'
        ? await fetchCaliforniaStateParksTrailGeometry(geometrySource)
        : null;
    if (!geometry) return NextResponse.json({ error: 'Unsupported route geometry provider' }, { status: 502 });
    return NextResponse.json({
      trailId: trail.id,
      geometry,
      distanceMiles: Number(geometryDistanceMiles(geometry).toFixed(2)),
      elevation: null,
      source: geometrySource,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
