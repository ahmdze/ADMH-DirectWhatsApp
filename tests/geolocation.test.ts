import { describe, expect, it } from 'vitest';
import { mapsUrl } from '../src/lib/geolocation';

describe('location link', () => {
  it('builds a six-decimal Google Maps link', () => {
    expect(mapsUrl(33.3152, 44.3661)).toBe('https://maps.google.com/?q=33.315200,44.366100');
    expect(mapsUrl(-1.5, 2.25)).toContain('?q=-1.500000,2.250000');
  });
});
