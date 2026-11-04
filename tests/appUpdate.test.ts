import { describe, expect, it } from 'vitest';
import { compareVersions, isVersionNewer, parseVersion } from '../src/lib/appUpdate';

describe('app update version comparison', () => {
  it('compares versions numerically', () => {
    expect(compareVersions('2.3.10', '2.3.9')).toBe(1);
    expect(compareVersions('v2.3.2', '2.3.3')).toBe(-1);
    expect(compareVersions('2.3.2', 'v2.3.2')).toBe(0);
  });

  it('parses loose versions and rejects junk', () => {
    expect(parseVersion('v2.3.10-beta.1')).toEqual({ major: 2, minor: 3, patch: 10 });
    expect(parseVersion('nope')).toBeNull();
    expect(isVersionNewer('2.4.0', '2.3.2')).toBe(true);
  });
});
