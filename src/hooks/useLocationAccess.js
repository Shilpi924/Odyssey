'use client';

import { useCallback, useEffect, useState } from 'react';
import { allowLocationAccess, forgetLocationAccess, hasLocationAccess, LOCATION_ACCESS_EVENT } from '@/lib/location-access';

export default function useLocationAccess() {
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    const update = () => {
      setLocationAllowed(hasLocationAccess());
      setLocationReady(true);
    };
    const frame = window.requestAnimationFrame(update);
    window.addEventListener(LOCATION_ACCESS_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(LOCATION_ACCESS_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const allowLocation = useCallback(() => {
    const stored = allowLocationAccess();
    setLocationAllowed(stored);
    return stored;
  }, []);

  const forgetLocation = useCallback(() => {
    forgetLocationAccess();
    setLocationAllowed(false);
  }, []);

  return { locationAllowed, locationReady, allowLocation, forgetLocation };
}
