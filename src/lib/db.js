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
