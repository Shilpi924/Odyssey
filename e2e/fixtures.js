export const mockedTrailResponse = {
  source: 'catalog', weather: null, entity: { type: 'park', id: 'nps-yose' },
  trails: [{ name: 'Half Dome via the John Muir Trail', lat: 37.7459, lng: -119.5332, distance: '2.5', difficulty: 'Strenuous', length: '16.2 miles', rating: null, userRatingsTotal: 0, features: ['Summit', 'Scenic'], sourceAttribution: 'Source: National Park Service', geometrySource: { provider: 'osm' }, access: { status: 'Unknown', permitRequired: true } }],
};

export const mockedStadiaStyle = {
  version: 8,
  sources: {
    attribution: {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: 'attribution', type: 'circle', source: 'attribution' }],
};
