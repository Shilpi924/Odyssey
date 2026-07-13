import { defaultCache } from '@serwist/next/worker';
import { NetworkOnly, Serwist } from 'serwist';

const runtimeCaching = [
  {
    matcher: ({ url }) => url.hostname === 'stadiamaps.com' || url.hostname.endsWith('.stadiamaps.com'),
    handler: new NetworkOnly(),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();
