import { defaultCache } from '@serwist/next/worker';
import { NetworkOnly, Serwist } from 'serwist';

const customCaching = [
  {
    matcher: ({ url }) => url.hostname === 'tile.openstreetmap.org',
    handler: new NetworkOnly(),
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
