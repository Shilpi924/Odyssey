const EARTH_RADIUS_MILES = 3958.8;

function samePoint(a, b) {
  return a && b && Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;
}

export function stitchLineSegments(segments) {
  const remaining = segments.filter(segment => segment.length >= 2).map(segment => [...segment]);
  const lines = [];
  while (remaining.length) {
    const line = remaining.shift();
    let attached = true;
    while (attached) {
      attached = false;
      for (let index = 0; index < remaining.length; index += 1) {
        const segment = remaining[index];
        if (samePoint(line.at(-1), segment[0])) line.push(...segment.slice(1));
        else if (samePoint(line.at(-1), segment.at(-1))) line.push(...segment.slice(0, -1).reverse());
        else if (samePoint(line[0], segment.at(-1))) line.unshift(...segment.slice(0, -1));
        else if (samePoint(line[0], segment[0])) line.unshift(...segment.slice(1).reverse());
        else continue;
        remaining.splice(index, 1);
        attached = true;
        break;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function relationToMultiLineString(relation) {
  const segments = (relation?.members || [])
    .filter(member => member.type === 'way' && member.geometry?.length >= 2)
    .map(member => {
      const coordinates = member.geometry.map(point => [point.lon, point.lat]);
      return member.role === 'backward' ? coordinates.reverse() : coordinates;
    });
  return { type: 'MultiLineString', coordinates: stitchLineSegments(segments) };
}

function segmentMiles(a, b) {
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function geometryDistanceMiles(geometry) {
  const lines = geometry?.type === 'LineString' ? [geometry.coordinates] : geometry?.coordinates || [];
  return lines.reduce((total, line) => total + line.slice(1).reduce((lineTotal, point, index) => lineTotal + segmentMiles(line[index], point), 0), 0);
}

export function elevationStats(samples) {
  const elevations = samples.map(sample => Number(sample.elevationFeet)).filter(Number.isFinite);
  let gain = 0;
  for (let index = 1; index < elevations.length; index += 1) gain += Math.max(0, elevations[index] - elevations[index - 1]);
  return {
    elevationGainFeet: Math.round(gain),
    minElevationFeet: elevations.length ? Math.round(Math.min(...elevations)) : null,
    maxElevationFeet: elevations.length ? Math.round(Math.max(...elevations)) : null,
  };
}

