// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  activitySyncPayload,
  activityToGpx,
  createCompletedActivity,
  formatDistance,
  formatDuration,
  formatPace,
} from '../src/lib/activities.js';

describe('completed activities', () => {
  const points = Array.from({ length: 40 }, (_, index) => ({
    latitude: 37.7 + index * 0.001,
    longitude: -119.5 + index * 0.001,
    altitude: 1000 + index,
    timestamp: 1_700_000_000_000 + index * 1000,
    accuracy: 8,
    accepted: true,
  }));

  it('builds a private activity with calculated pace and a route', () => {
    const activity = createCompletedActivity({
      id: 'activity-1',
      trail: { placeId: 'half-dome-jmt', name: 'Half Dome' },
      startedAt: 1_700_000_000_000,
      completedAt: 1_700_007_200_000,
      durationSeconds: 7200,
      distanceMeters: 16093.44,
      elevationGainMeters: 1000,
      points,
    });
    expect(activity).toMatchObject({
      id: 'activity-1',
      trailId: 'half-dome-jmt',
      visibility: 'private',
      hideStartEnd: true,
      averagePaceSecondsPerMile: 720,
      route: { type: 'LineString' },
    });
    expect(activity.points).toHaveLength(40);
  });

  it('formats activity metrics for people rather than raw units', () => {
    expect(formatDistance(8046.72)).toBe('5.00 mi');
    expect(formatDuration(7260)).toBe('2h 1m');
    expect(formatPace(754)).toBe('12:34 /mi');
  });

  it('exports valid escaped GPX data', () => {
    const gpx = activityToGpx({ title: 'Ridge & Falls', points: points.slice(0, 2) });
    expect(gpx).toContain('<name>Ridge &amp; Falls</name>');
    expect(gpx).toContain('<trkpt lat="37.7" lon="-119.5">');
    expect(gpx).toContain('<time>');
  });

  it('trims route endpoints from the cloud payload by default', () => {
    const activity = createCompletedActivity({ trail: { name: 'Private trail' }, points, distanceMeters: 1000 });
    const payload = activitySyncPayload(activity);
    expect(payload.route.coordinates.length).toBeLessThan(activity.route.coordinates.length);
    expect(payload.route.coordinates[0]).not.toEqual(activity.route.coordinates[0]);
  });
});
