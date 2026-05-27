import { describe, it, expect } from 'vitest';
import {
  createVectorClock,
  incrementClock,
  mergeClocks,
  compareClocks,
  createEnvelope,
  decryptEnvelope,
  detectConflict,
  validateEnvelope,
  shouldAcceptRemote,
  ENVELOPE_VERSION,
  MIN_KDF_ITERATIONS,
} from '../../src/engine/cloud-sync';
import type { CryptoPort, SyncEnvelope, CloudSyncConfig } from '../../src/engine/cloud-sync';

/** Simple mock crypto port using base64 XOR "encryption" for testing. */
function mockCryptoPort(): CryptoPort {
  let counter = 0;
  return {
    randomBytes: (length: number) => {
      counter++;
      return btoa(String.fromCharCode(...Array.from({ length }, (_, i) => (i + counter) % 256)));
    },
    deriveKey: async (passphrase: string, salt: string, _iterations: number, _hash: string) => {
      // Deterministic "key" for testing — just hash passphrase + salt
      return btoa(passphrase + ':' + salt);
    },
    encrypt: async (plaintext: string, _key: string, _iv: string) => {
      // Simple base64 encoding (NOT real encryption — test only)
      return btoa(plaintext);
    },
    decrypt: async (ciphertext: string, _key: string, _iv: string) => {
      return atob(ciphertext);
    },
  };
}

const TEST_CONFIG: CloudSyncConfig = {
  peerId: 'device-A',
  kdfIterations: 600000,
  kdfHash: 'SHA-256',
  algorithm: 'aes-256-gcm',
};

describe('cloud-sync', () => {
  describe('vector clock operations', () => {
    it('createVectorClock initialises peer to 0', () => {
      const clock = createVectorClock('peer-1');
      expect(clock).toEqual({ 'peer-1': 0 });
    });

    it('incrementClock advances the peer counter', () => {
      const clock = createVectorClock('peer-1');
      const next = incrementClock(clock, 'peer-1');
      expect(next['peer-1']).toBe(1);
    });

    it('incrementClock creates entry for unknown peer', () => {
      const clock = createVectorClock('peer-1');
      const next = incrementClock(clock, 'peer-2');
      expect(next['peer-2']).toBe(1);
      expect(next['peer-1']).toBe(0);
    });

    it('mergeClocks takes max of each peer', () => {
      const a = { 'peer-1': 3, 'peer-2': 1 };
      const b = { 'peer-1': 2, 'peer-2': 4, 'peer-3': 1 };
      const merged = mergeClocks(a, b);
      expect(merged).toEqual({ 'peer-1': 3, 'peer-2': 4, 'peer-3': 1 });
    });

    it.each([
      { local: { a: 1, b: 2 }, remote: { a: 1, b: 2 }, expected: 'equal' as const },
      { local: { a: 2, b: 2 }, remote: { a: 1, b: 2 }, expected: 'ahead' as const },
      { local: { a: 1, b: 2 }, remote: { a: 2, b: 2 }, expected: 'behind' as const },
      { local: { a: 2, b: 1 }, remote: { a: 1, b: 2 }, expected: 'concurrent' as const },
    ])('compareClocks($local, $remote) → $expected', ({ local, remote, expected }) => {
      expect(compareClocks(local, remote)).toBe(expected);
    });

    it('compareClocks handles missing peers', () => {
      const local = { a: 1 };
      const remote = { a: 1, b: 1 };
      expect(compareClocks(local, remote)).toBe('behind');
    });
  });

  describe('createEnvelope', () => {
    it('creates a valid encrypted envelope', async () => {
      const crypto = mockCryptoPort();
      const clock = createVectorClock('device-A');
      const envelope = await createEnvelope(
        '{"test": true}',
        'project-1',
        clock,
        crypto,
        'my-secret-passphrase',
        TEST_CONFIG,
      );

      expect(envelope.version).toBe(ENVELOPE_VERSION);
      expect(envelope.projectId).toBe('project-1');
      expect(envelope.algorithm).toBe('aes-256-gcm');
      expect(envelope.ciphertext).toBeTruthy();
      expect(envelope.iv).toBeTruthy();
      expect(envelope.kdf.algorithm).toBe('pbkdf2');
      expect(envelope.kdf.iterations).toBe(600000);
      expect(envelope.vectorClock['device-A']).toBe(1);
      expect(envelope.plaintextSize).toBeGreaterThan(0);
    });

    it('throws on short passphrase', async () => {
      const crypto = mockCryptoPort();
      const clock = createVectorClock('device-A');
      await expect(createEnvelope('data', 'proj', clock, crypto, 'short', TEST_CONFIG)).rejects.toThrow(
        'passphrase must be at least 8 characters',
      );
    });

    it('throws on empty plaintext', async () => {
      const crypto = mockCryptoPort();
      const clock = createVectorClock('device-A');
      await expect(createEnvelope('', 'proj', clock, crypto, 'my-secret-passphrase', TEST_CONFIG)).rejects.toThrow(
        'plaintext must not be empty',
      );
    });
  });

  describe('decryptEnvelope', () => {
    it('round-trips plaintext through encrypt/decrypt', async () => {
      const crypto = mockCryptoPort();
      const clock = createVectorClock('device-A');
      const original = JSON.stringify({ cabinets: [{ width: 600 }] });
      const envelope = await createEnvelope(original, 'proj-1', clock, crypto, 'strong-passphrase', TEST_CONFIG);
      const decrypted = await decryptEnvelope(envelope, 'strong-passphrase', crypto);

      expect(decrypted).toBe(original);
    });

    it('throws on short passphrase', async () => {
      const crypto = mockCryptoPort();
      const clock = createVectorClock('device-A');
      const envelope = await createEnvelope('data', 'proj', clock, crypto, 'long-enough-pass', TEST_CONFIG);
      await expect(decryptEnvelope(envelope, 'short', crypto)).rejects.toThrow(
        'passphrase must be at least 8 characters',
      );
    });
  });

  describe('detectConflict', () => {
    it('returns null when clocks are not concurrent', async () => {
      const crypto = mockCryptoPort();
      const clock = createVectorClock('device-A');
      const env1 = await createEnvelope('a', 'proj', clock, crypto, 'passphrase1', TEST_CONFIG);
      const env2 = await createEnvelope('b', 'proj', env1.vectorClock, crypto, 'passphrase1', TEST_CONFIG);

      expect(detectConflict(env1, env2)).toBeNull();
    });

    it('detects concurrent edits as conflict', async () => {
      const crypto = mockCryptoPort();
      const baseClock = { 'device-A': 1, 'device-B': 1 };

      const configA: CloudSyncConfig = { ...TEST_CONFIG, peerId: 'device-A' };
      const configB: CloudSyncConfig = { ...TEST_CONFIG, peerId: 'device-B' };

      const envA = await createEnvelope('edit-A', 'proj', baseClock, crypto, 'passphrase1', configA);
      const envB = await createEnvelope('edit-B', 'proj', baseClock, crypto, 'passphrase1', configB);

      const conflict = detectConflict(envA, envB);
      expect(conflict).not.toBeNull();
      expect(conflict?.comparison).toBe('concurrent');
    });
  });

  describe('validateEnvelope', () => {
    it('accepts a valid envelope', async () => {
      const crypto = mockCryptoPort();
      const clock = createVectorClock('device-A');
      const envelope = await createEnvelope('data', 'proj', clock, crypto, 'passphrase1', TEST_CONFIG);
      const result = validateEnvelope(envelope);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it.each([
      { field: 'version', value: 99, error: 'Unsupported envelope version' },
      { field: 'id', value: '', error: 'Missing envelope ID' },
      { field: 'projectId', value: '', error: 'Missing project ID' },
      { field: 'algorithm', value: 'rot13', error: 'Unsupported algorithm' },
      { field: 'iv', value: '', error: 'Missing IV' },
      { field: 'ciphertext', value: '', error: 'Missing ciphertext' },
    ])('rejects envelope with invalid $field', async ({ field, value, error }) => {
      const crypto = mockCryptoPort();
      const clock = createVectorClock('device-A');
      const envelope = await createEnvelope('data', 'proj', clock, crypto, 'passphrase1', TEST_CONFIG);
      const modified = { ...envelope, [field]: value } as unknown as SyncEnvelope;
      const result = validateEnvelope(modified);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes(error))).toBe(true);
    });

    it('rejects low KDF iterations', async () => {
      const crypto = mockCryptoPort();
      const clock = createVectorClock('device-A');
      const envelope = await createEnvelope('data', 'proj', clock, crypto, 'passphrase1', TEST_CONFIG);
      const modified = { ...envelope, kdf: { ...envelope.kdf, iterations: 1000 } };
      const result = validateEnvelope(modified);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes(String(MIN_KDF_ITERATIONS)))).toBe(true);
    });
  });

  describe('shouldAcceptRemote', () => {
    it('accepts remote when no local state', () => {
      const remote = { vectorClock: { a: 1 } } as SyncEnvelope;
      expect(shouldAcceptRemote(null, remote)).toBe(true);
    });

    it('accepts remote when local is behind', () => {
      const local = { vectorClock: { a: 1 } } as SyncEnvelope;
      const remote = { vectorClock: { a: 2 } } as SyncEnvelope;
      expect(shouldAcceptRemote(local, remote)).toBe(true);
    });

    it('rejects remote when local is ahead', () => {
      const local = { vectorClock: { a: 2 } } as SyncEnvelope;
      const remote = { vectorClock: { a: 1 } } as SyncEnvelope;
      expect(shouldAcceptRemote(local, remote)).toBe(false);
    });

    it('rejects remote when clocks are concurrent', () => {
      const local = { vectorClock: { a: 2, b: 1 } } as SyncEnvelope;
      const remote = { vectorClock: { a: 1, b: 2 } } as SyncEnvelope;
      expect(shouldAcceptRemote(local, remote)).toBe(false);
    });
  });
});
