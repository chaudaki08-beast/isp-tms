'use client';

export type Coords = { lat: number; lng: number; accuracy?: number; speed?: number };

/** Promise wrapper around the Geolocation API. */
export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed ?? undefined,
        }),
      (err) => reject(new Error(err.message || 'Unable to get location.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
