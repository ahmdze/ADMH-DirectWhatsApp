import { isNative } from './native';

export type LocationError = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export interface LocationPoint {
  latitude: number;
  longitude: number;
}

export type LocationResult =
  | { ok: true; point: LocationPoint }
  | { ok: false; error: LocationError };

/** A Google Maps link that works without an API key or a server. */
export function mapsUrl(latitude: number, longitude: number): string {
  return `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

function mapBrowserError(code: number): LocationError {
  if (code === 1) return 'denied';
  if (code === 3) return 'timeout';
  return 'unavailable';
}

/**
 * Native path asks Android for the runtime location permission through the
 * Capacitor plugin; the web path uses the browser geolocation API. Nothing is
 * stored: the caller appends only a maps URL to the message.
 */
export async function getCurrentLocation(): Promise<LocationResult> {
  if (isNative()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      let permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        permission = await Geolocation.requestPermissions();
      }
      if (permission.location !== 'granted') return { ok: false, error: 'denied' };
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 30_000
      });
      return {
        ok: true,
        point: { latitude: position.coords.latitude, longitude: position.coords.longitude }
      };
    } catch (error) {
      const message = (error as Error)?.message?.toLowerCase() || '';
      if (message.includes('denied') || message.includes('permission')) return { ok: false, error: 'denied' };
      if (message.includes('timeout')) return { ok: false, error: 'timeout' };
      return { ok: false, error: 'unavailable' };
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { ok: false, error: 'unsupported' };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          ok: true,
          point: { latitude: position.coords.latitude, longitude: position.coords.longitude }
        }),
      (error) => resolve({ ok: false, error: mapBrowserError(error.code) }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 }
    );
  });
}
