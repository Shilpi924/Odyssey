export const MOUNT_DIABLO_PARK = Object.freeze({
  id: 'ca-sp-mount-diablo',
  slug: 'mount-diablo-state-park',
  name: 'Mount Diablo State Park',
  aliases: ['Mount Diablo', 'Mt Diablo', 'Mt. Diablo', 'Diablo'],
  parkCode: null,
  state: 'CA',
  countryCode: 'US',
  center: { lat: 37.8721, lng: -121.9414 },
  // Conservative search envelope based on the published park extent. This is
  // used for discovery only and is not represented as a legal park boundary.
  searchBoundary: {
    type: 'Polygon',
    coordinates: [[
      [-121.9935, 37.8168],
      [-121.8410, 37.8168],
      [-121.8410, 37.9267],
      [-121.9935, 37.9267],
      [-121.9935, 37.8168],
    ]],
  },
  boundaryAuthority: 'search-envelope',
  source: {
    provider: 'ca-state-parks',
    externalId: '517',
    sourceUrl: 'https://www.parks.ca.gov/?page_id=517',
    license: 'Official public information; source materials may be copyrighted',
    attribution: 'Source: California State Parks',
  },
});
