import Dexie from 'dexie';

// Create a new Dexie database
export const db = new Dexie('TravelBuddyDB');

// Define the schema
// Version 2: Added activeHikes and activeHikePoints for durable, offline-first GPS tracking.
db.version(2).stores({
  savedHikes: '++id, name, lat, lng, [name+lat]', // Primary key is auto-incremented id
  activeHikes: 'id, status, startedAt, pausedAt, totalPausedMs, distanceMeters, elevationGainMeters',
  activeHikePoints: '++pointId, hikeId, timestamp, accepted'
});

// Version 3: Completed activities are durable, device-local records. Optional
// account sync is explicit and never required for GPS recording.
db.version(3).stores({
  savedHikes: '++id, name, lat, lng, [name+lat]',
  activeHikes: 'id, status, startedAt, pausedAt, totalPausedMs, distanceMeters, elevationGainMeters',
  activeHikePoints: '++pointId, hikeId, timestamp, accepted',
  completedActivities: 'id, completedAt, startedAt, trailId, visibility, syncedAt',
});
