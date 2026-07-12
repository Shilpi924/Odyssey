const NPS_VALLEY_DAY_HIKES = 'https://www.nps.gov/yose/planyourvisit/valleyhikes.htm';
const NPS_VALLEY_TRAILS = 'https://www.nps.gov/yose/planyourvisit/yosemite-valley-trails.htm';

function npsTrail({ id, name, aliases = [], trailhead, difficulty, route, features, permitRequired = false, sourceUrl = NPS_VALLEY_DAY_HIKES }) {
  return {
    id,
    slug: id,
    name,
    aliases,
    geography: {
      parkId: 'nps-yose',
      parkName: 'Yosemite National Park',
      region: 'Yosemite Valley',
      state: 'CA',
      countryCode: 'US',
    },
    trailhead,
    route,
    difficulty,
    activities: ['Hiking'],
    features,
    access: { status: 'Unknown', permitRequired },
    source: {
      provider: 'nps',
      externalId: id,
      sourceUrl,
      license: 'U.S. federal government work; verify per-asset restrictions',
      attribution: 'Source: National Park Service',
    },
  };
}

export const YOSEMITE_TRAILS = Object.freeze([
  npsTrail({
    id: 'half-dome-jmt', name: 'Half Dome via the John Muir Trail', aliases: ['Half Dome', 'Half Dome Trail'],
    trailhead: { lat: 37.7326, lng: -119.5583 }, difficulty: 'Strenuous',
    route: { type: 'Out and back', distanceMiles: 16.2, elevationGainFeet: 4830 },
    features: ['Summit', 'Scenic', 'Waterfall', 'Cables'], permitRequired: true, sourceUrl: NPS_VALLEY_TRAILS,
  }),
  npsTrail({
    id: 'el-capitan-trail', name: 'El Capitan Trail', aliases: ['El Capitan'],
    trailhead: { lat: 37.7424, lng: -119.6022 }, difficulty: 'Strenuous',
    route: { type: 'Out and back', distanceMiles: 15.4, elevationGainFeet: 3800 },
    features: ['Summit', 'Scenic', 'Forest'], sourceUrl: NPS_VALLEY_TRAILS,
  }),
  npsTrail({
    id: 'upper-yosemite-fall-trail', name: 'Upper Yosemite Fall Trail', aliases: ['Yosemite Falls Trail'],
    trailhead: { lat: 37.7424, lng: -119.6022 }, difficulty: 'Strenuous',
    route: { type: 'Out and back', distanceMiles: 7.2, elevationGainFeet: 2700 },
    features: ['Waterfall', 'Scenic', 'Valley views'],
  }),
  npsTrail({
    id: 'snow-creek-trail', name: 'Snow Creek Trail',
    trailhead: { lat: 37.7450, lng: -119.5538 }, difficulty: 'Strenuous',
    route: { type: 'Out and back', distanceMiles: 9.4, elevationGainFeet: 2700 },
    features: ['Scenic', 'Valley views'],
  }),
  npsTrail({
    id: 'four-mile-trail', name: 'Four Mile Trail', aliases: ['Four Mile Trail to Glacier Point'],
    trailhead: { lat: 37.7333, lng: -119.6017 }, difficulty: 'Strenuous',
    route: { type: 'Point to point', distanceMiles: 4.8, elevationGainFeet: 3200 },
    features: ['Scenic', 'Valley views'],
  }),
  npsTrail({
    id: 'lower-yosemite-fall-trail', name: 'Lower Yosemite Fall Trail', aliases: ['Lower Yosemite Falls'],
    trailhead: { lat: 37.7457, lng: -119.5956 }, difficulty: 'Easy',
    route: { type: 'Loop', distanceMiles: 1, elevationGainFeet: 50 },
    features: ['Waterfall', 'Paved', 'Scenic'],
  }),
  npsTrail({
    id: 'bridalveil-fall-trail', name: 'Bridalveil Fall Trail', aliases: ['Bridalveil Falls'],
    trailhead: { lat: 37.7168, lng: -119.6462 }, difficulty: 'Easy',
    route: { type: 'Out and back', distanceMiles: 0.5, elevationGainFeet: 80 },
    features: ['Waterfall', 'Scenic'],
  }),
  npsTrail({
    id: 'cooks-meadow-loop', name: "Cook's Meadow Loop", aliases: ['Cooks Meadow'],
    trailhead: { lat: 37.7465, lng: -119.5924 }, difficulty: 'Easy',
    route: { type: 'Loop', distanceMiles: 1, elevationGainFeet: 0 },
    features: ['Meadow', 'Scenic', 'Valley views'],
  }),
  npsTrail({
    id: 'mirror-lake-loop', name: 'Mirror Lake Loop', aliases: ['Mirror Lake Trail'],
    trailhead: { lat: 37.7384, lng: -119.5538 }, difficulty: 'Moderate',
    route: { type: 'Loop', distanceMiles: 5, elevationGainFeet: 200 },
    features: ['Lake', 'Scenic', 'Valley views'],
  }),
  npsTrail({
    id: 'valley-loop-trail', name: 'Valley Loop Trail', aliases: ['Yosemite Valley Loop'],
    trailhead: { lat: 37.7403, lng: -119.5770 }, difficulty: 'Moderate',
    route: { type: 'Loop', distanceMiles: 13, elevationGainFeet: 0 },
    features: ['Forest', 'Meadow', 'Scenic', 'Valley views'],
  }),
]);

