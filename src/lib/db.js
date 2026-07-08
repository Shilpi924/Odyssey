import Dexie from 'dexie';

// Create a new Dexie database
export const db = new Dexie('TravelBuddyDB');

// Define the schema
// - hikes: We use a compound index on [name+lat] to prevent duplicate saves. We also store a Blob of the static map image.
db.version(1).stores({
  savedHikes: '++id, name, lat, lng, [name+lat]', // Primary key is auto-incremented id
});
