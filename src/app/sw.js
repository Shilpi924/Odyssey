import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';
import { BackgroundSyncPlugin } from '@serwist/background-sync';

const bgSyncPlugin = new BackgroundSyncPlugin('hike-sync-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 Hours
});

const customCaching = [
  {
    matcher: /\/api\/sync-hike/,
    handler: 'NetworkOnly',
    options: {
      backgroundSync: {
        name: 'hike-sync-queue',
        options: {
          maxRetentionTime: 24 * 60,
        },
      },
      plugins: [bgSyncPlugin]
    },
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: customCaching,
});

serwist.addEventListeners();
