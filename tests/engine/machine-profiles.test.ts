import { describe, expect, it } from 'vitest';
import { getMachineProfile, MACHINE_PROFILE_IDS } from '../../src/engine/machine-profiles';

describe('getMachineProfile', () => {
  it.each(MACHINE_PROFILE_IDS)('returns the registered profile for %s', (id) => {
    const profile = getMachineProfile(id);

    expect(profile).toBeDefined();
    expect(profile?.id).toBe(id);
  });

  it('returns undefined for an unknown profile ID', () => {
    expect(getMachineProfile('unknown-machine')).toBeUndefined();
  });
});
