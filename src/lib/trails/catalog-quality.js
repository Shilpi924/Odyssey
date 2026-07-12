function normalizedName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function distanceMiles(a, b) {
  const radius = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function findDuplicateCandidates(trails, maxTrailheadDistanceMiles = 0.25) {
  const candidates = [];
  for (let left = 0; left < trails.length; left += 1) {
    for (let right = left + 1; right < trails.length; right += 1) {
      const a = trails[left];
      const b = trails[right];
      const namesA = [a.name, ...a.aliases].map(normalizedName);
      const namesB = [b.name, ...b.aliases].map(normalizedName);
      const sharesName = namesA.some(name => namesB.includes(name));
      const nearby = distanceMiles(a.trailhead, b.trailhead) <= maxTrailheadDistanceMiles;
      if (sharesName && nearby) candidates.push({ leftId: a.id, rightId: b.id, reasons: ['shared-name', 'nearby-trailhead'] });
    }
  }
  return candidates;
}

export function catalogCompleteness(trail) {
  const checks = [
    trail.geography.parkId,
    trail.trailhead.lat != null && trail.trailhead.lng != null,
    trail.route.type,
    trail.route.distanceMiles != null,
    trail.route.elevationGainFeet != null,
    trail.difficulty,
    trail.features.length > 0,
    trail.source.sourceUrl,
    trail.source.license,
    trail.source.attribution,
  ];
  return checks.filter(Boolean).length / checks.length;
}

