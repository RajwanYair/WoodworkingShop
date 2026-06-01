export type CapabilityStatus = 'active' | 'experimental' | 'disabled';

export interface CapabilityContract {
  id: string;
  name: string;
  owner: string;
  sourceFile: string;
  requiresNetwork: boolean;
  criticalPath: boolean;
  defaultEnabled: boolean;
  status: CapabilityStatus;
  featureFlag?: string;
  description: string;
}

export const CAPABILITY_CONTRACTS: readonly CapabilityContract[] = [
  {
    id: 'error-reporter',
    name: 'Client Error Reporter',
    owner: 'Repo Maintainer',
    sourceFile: 'src/services/error-reporter.ts',
    requiresNetwork: false,
    criticalPath: false,
    defaultEnabled: true,
    status: 'active',
    description: 'Collects sanitized client-side error telemetry for local diagnostics and optional forwarding.',
  },
  {
    id: 'supabase-sync',
    name: 'Supabase Sync Adapter',
    owner: 'Repo Maintainer',
    sourceFile: 'src/services/supabase.ts',
    requiresNetwork: true,
    criticalPath: false,
    defaultEnabled: false,
    status: 'experimental',
    featureFlag: 'SUPABASE_SYNC',
    description:
      'Optional cloud-sync boundary adapter. Core workflows must remain fully functional when this capability is unavailable.',
  },
] as const;

export function getCapabilityContracts(): readonly CapabilityContract[] {
  return CAPABILITY_CONTRACTS;
}

export function getCapabilityContract(id: string): CapabilityContract | undefined {
  return CAPABILITY_CONTRACTS.find((contract) => contract.id === id);
}

export function getOptionalNetworkCapabilities(): readonly CapabilityContract[] {
  return CAPABILITY_CONTRACTS.filter((contract) => contract.requiresNetwork && contract.criticalPath === false);
}

export function validateCapabilityContracts(
  contracts: readonly CapabilityContract[] = CAPABILITY_CONTRACTS,
): readonly string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const contract of contracts) {
    if (!contract.id.trim()) {
      errors.push('Capability id must not be empty.');
      continue;
    }

    if (seenIds.has(contract.id)) {
      errors.push(`Duplicate capability id: ${contract.id}`);
    }
    seenIds.add(contract.id);

    if (!contract.owner.trim()) {
      errors.push(`Capability ${contract.id} must define an owner.`);
    }

    if (!contract.sourceFile.startsWith('src/')) {
      errors.push(`Capability ${contract.id} sourceFile must be under src/: ${contract.sourceFile}`);
    }

    if (contract.requiresNetwork && contract.criticalPath) {
      errors.push(`Capability ${contract.id} cannot be both network-required and critical-path.`);
    }

    if (contract.defaultEnabled && contract.status === 'disabled') {
      errors.push(`Capability ${contract.id} is disabled but marked defaultEnabled.`);
    }

    if (contract.featureFlag !== undefined && contract.featureFlag.trim().length === 0) {
      errors.push(`Capability ${contract.id} featureFlag must not be empty.`);
    }
  }

  return errors;
}
