import { describe, expect, it } from 'vitest';
import {
  CAPABILITY_CONTRACTS,
  getCapabilityContract,
  getOptionalNetworkCapabilities,
  validateCapabilityContracts,
  type CapabilityContract,
} from '../../src/services/capability-contracts';

describe('capability contracts', () => {
  it('default contracts pass validation', () => {
    expect(validateCapabilityContracts()).toEqual([]);
  });

  it('returns known contract by id', () => {
    const contract = getCapabilityContract('supabase-sync');
    expect(contract).toBeDefined();
    expect(contract?.requiresNetwork).toBe(true);
  });

  it('returns undefined for unknown contract id', () => {
    expect(getCapabilityContract('unknown')).toBeUndefined();
  });

  it('filters optional network capabilities', () => {
    const optionalNetwork = getOptionalNetworkCapabilities();
    expect(optionalNetwork.length).toBeGreaterThan(0);
    expect(optionalNetwork.every((contract) => contract.requiresNetwork && !contract.criticalPath)).toBe(true);
  });

  it.each(CAPABILITY_CONTRACTS)('has source path under src for %s', (contract) => {
    expect(contract.sourceFile.startsWith('src/')).toBe(true);
  });

  it('detects duplicate ids and invalid critical network contract combinations', () => {
    const invalid: CapabilityContract[] = [
      {
        id: 'dup',
        name: 'Duplicate One',
        owner: 'Owner',
        sourceFile: 'src/services/a.ts',
        requiresNetwork: false,
        criticalPath: false,
        defaultEnabled: false,
        status: 'active',
        description: 'ok',
      },
      {
        id: 'dup',
        name: 'Duplicate Two',
        owner: 'Owner',
        sourceFile: 'src/services/b.ts',
        requiresNetwork: true,
        criticalPath: true,
        defaultEnabled: false,
        status: 'experimental',
        featureFlag: 'FLAG',
        description: 'bad combo',
      },
    ];

    const errors = validateCapabilityContracts(invalid);
    expect(errors.some((error) => error.includes('Duplicate capability id: dup'))).toBe(true);
    expect(errors.some((error) => error.includes('cannot be both network-required and critical-path'))).toBe(true);
  });
});
