/**
 * Sprint 158 — Cloud sync engine with E2E encryption.
 *
 * Provides a client-side encryption layer for project data before it leaves
 * the browser. Uses the Web Crypto API (AES-GCM 256-bit) for symmetric
 * encryption and PBKDF2 for key derivation from a user passphrase.
 *
 * Features:
 *   - Key derivation from passphrase (PBKDF2, 600000 iterations, SHA-256)
 *   - AES-GCM 256-bit encrypt/decrypt of arbitrary payloads
 *   - Sync envelope wrapping (metadata + encrypted payload)
 *   - Sync conflict detection (vector clock comparison)
 *   - Envelope validation and integrity checks
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 * Note: actual Web Crypto calls are abstracted behind an injectable CryptoPort
 * interface so the engine remains testable without browser APIs.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Supported encryption algorithms. */
export type EncryptionAlgorithm = 'aes-256-gcm';

/** Key derivation parameters. */
export interface KeyDerivationParams {
  /** Algorithm used to derive the key. */
  algorithm: 'pbkdf2';
  /** Number of PBKDF2 iterations. */
  iterations: number;
  /** Hash function for PBKDF2. */
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512';
  /** Salt (base64-encoded). */
  salt: string;
}

/** Encrypted payload envelope for cloud sync. */
export interface SyncEnvelope {
  /** Schema version for forward compatibility. */
  version: number;
  /** Unique envelope ID. */
  id: string;
  /** Project ID this envelope belongs to. */
  projectId: string;
  /** Encryption algorithm used. */
  algorithm: EncryptionAlgorithm;
  /** Key derivation parameters (stored alongside ciphertext for re-derivation). */
  kdf: KeyDerivationParams;
  /** Initialisation vector (base64-encoded). */
  iv: string;
  /** Encrypted payload (base64-encoded ciphertext). */
  ciphertext: string;
  /** Vector clock for conflict detection (peerId → counter). */
  vectorClock: Record<string, number>;
  /** ISO 8601 timestamp of encryption. */
  encryptedAt: string;
  /** Size of the original plaintext in bytes. */
  plaintextSize: number;
}

/** Result of comparing two vector clocks. */
export type ClockComparison = 'equal' | 'ahead' | 'behind' | 'concurrent';

/** Sync conflict descriptor. */
export interface SyncConflict {
  /** Local envelope. */
  local: SyncEnvelope;
  /** Remote envelope. */
  remote: SyncEnvelope;
  /** Clock comparison result. */
  comparison: ClockComparison;
}

/** Validation result for an envelope. */
export interface EnvelopeValidation {
  valid: boolean;
  errors: string[];
}

/** Configuration for the sync engine. */
export interface CloudSyncConfig {
  /** Current peer/device ID. */
  peerId: string;
  /** PBKDF2 iterations (default 600000). */
  kdfIterations: number;
  /** Hash algorithm for KDF. */
  kdfHash: 'SHA-256' | 'SHA-384' | 'SHA-512';
  /** Encryption algorithm. */
  algorithm: EncryptionAlgorithm;
}

/** Port interface for crypto operations (injectable for testing). */
export interface CryptoPort {
  /** Generate random bytes as base64. */
  randomBytes: (length: number) => string;
  /** Derive a key from passphrase + salt + params. Returns base64 key material. */
  deriveKey: (passphrase: string, salt: string, iterations: number, hash: string) => Promise<string>;
  /** Encrypt plaintext with key + IV. Returns base64 ciphertext. */
  encrypt: (plaintext: string, key: string, iv: string) => Promise<string>;
  /** Decrypt ciphertext with key + IV. Returns plaintext. */
  decrypt: (ciphertext: string, key: string, iv: string) => Promise<string>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Current envelope schema version. */
export const ENVELOPE_VERSION = 1;

/** Default sync configuration. */
export const DEFAULT_CLOUD_SYNC_CONFIG: CloudSyncConfig = {
  peerId: 'local',
  kdfIterations: 600000,
  kdfHash: 'SHA-256',
  algorithm: 'aes-256-gcm',
};

/** Minimum acceptable PBKDF2 iterations for security. */
export const MIN_KDF_ITERATIONS = 100000;

/** IV length in bytes for AES-GCM. */
export const IV_LENGTH_BYTES = 12;

/** Salt length in bytes for PBKDF2. */
export const SALT_LENGTH_BYTES = 16;

// ─── Vector clock operations ──────────────────────────────────────────────────

/**
 * Create a new vector clock with the local peer initialised to 0.
 *
 * @param peerId  Local peer identifier.
 * @returns Vector clock record.
 */
export function createVectorClock(peerId: string): Record<string, number> {
  return { [peerId]: 0 };
}

/**
 * Increment the local peer's counter in the vector clock.
 *
 * @param clock   Current vector clock.
 * @param peerId  Local peer ID.
 * @returns New clock with incremented counter.
 */
export function incrementClock(clock: Record<string, number>, peerId: string): Record<string, number> {
  return { ...clock, [peerId]: (clock[peerId] ?? 0) + 1 };
}

/**
 * Merge two vector clocks (take max of each peer's counter).
 *
 * @param a  First clock.
 * @param b  Second clock.
 * @returns Merged clock.
 */
export function mergeClocks(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const merged = { ...a };
  for (const [peer, count] of Object.entries(b)) {
    merged[peer] = Math.max(merged[peer] ?? 0, count);
  }
  return merged;
}

/**
 * Compare two vector clocks to determine causal ordering.
 *
 * @param local   Local vector clock.
 * @param remote  Remote vector clock.
 * @returns Comparison result.
 */
export function compareClocks(local: Record<string, number>, remote: Record<string, number>): ClockComparison {
  const allPeers = new Set([...Object.keys(local), ...Object.keys(remote)]);
  let localAhead = false;
  let remoteAhead = false;

  for (const peer of allPeers) {
    const l = local[peer] ?? 0;
    const r = remote[peer] ?? 0;
    if (l > r) localAhead = true;
    if (r > l) remoteAhead = true;
  }

  if (!localAhead && !remoteAhead) return 'equal';
  if (localAhead && !remoteAhead) return 'ahead';
  if (!localAhead && remoteAhead) return 'behind';
  return 'concurrent';
}

// ─── Envelope operations ──────────────────────────────────────────────────────

/**
 * Create a sync envelope by encrypting a plaintext payload.
 *
 * @param plaintext    JSON string to encrypt.
 * @param projectId    Project identifier.
 * @param vectorClock  Current vector clock.
 * @param crypto       Crypto port implementation.
 * @param config       Cloud sync configuration.
 * @returns Encrypted sync envelope.
 */
export async function createEnvelope(
  plaintext: string,
  projectId: string,
  vectorClock: Record<string, number>,
  crypto: CryptoPort,
  passphrase: string,
  config: CloudSyncConfig = DEFAULT_CLOUD_SYNC_CONFIG,
): Promise<SyncEnvelope> {
  if (!passphrase || passphrase.length < 8) {
    throw new RangeError('createEnvelope: passphrase must be at least 8 characters');
  }
  if (!plaintext) {
    throw new RangeError('createEnvelope: plaintext must not be empty');
  }

  const salt = crypto.randomBytes(SALT_LENGTH_BYTES);
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const key = await crypto.deriveKey(passphrase, salt, config.kdfIterations, config.kdfHash);
  const ciphertext = await crypto.encrypt(plaintext, key, iv);

  return {
    version: ENVELOPE_VERSION,
    id: crypto.randomBytes(16),
    projectId,
    algorithm: config.algorithm,
    kdf: {
      algorithm: 'pbkdf2',
      iterations: config.kdfIterations,
      hash: config.kdfHash,
      salt,
    },
    iv,
    ciphertext,
    vectorClock: incrementClock(vectorClock, config.peerId),
    encryptedAt: new Date().toISOString(),
    plaintextSize: new TextEncoder().encode(plaintext).length,
  };
}

/**
 * Decrypt a sync envelope back to plaintext.
 *
 * @param envelope    Encrypted envelope.
 * @param passphrase  User passphrase.
 * @param crypto      Crypto port implementation.
 * @returns Decrypted plaintext string.
 */
export async function decryptEnvelope(envelope: SyncEnvelope, passphrase: string, crypto: CryptoPort): Promise<string> {
  if (!passphrase || passphrase.length < 8) {
    throw new RangeError('decryptEnvelope: passphrase must be at least 8 characters');
  }

  const key = await crypto.deriveKey(passphrase, envelope.kdf.salt, envelope.kdf.iterations, envelope.kdf.hash);
  return crypto.decrypt(envelope.ciphertext, key, envelope.iv);
}

/**
 * Detect sync conflicts between local and remote envelopes.
 *
 * @param local   Local envelope.
 * @param remote  Remote envelope.
 * @returns Conflict descriptor if concurrent, null otherwise.
 */
export function detectConflict(local: SyncEnvelope, remote: SyncEnvelope): SyncConflict | null {
  const comparison = compareClocks(local.vectorClock, remote.vectorClock);
  if (comparison === 'concurrent') {
    return { local, remote, comparison };
  }
  return null;
}

/**
 * Validate a sync envelope's structural integrity (does NOT decrypt).
 *
 * @param envelope  Envelope to validate.
 * @returns Validation result with errors if any.
 */
export function validateEnvelope(envelope: SyncEnvelope): EnvelopeValidation {
  const errors: string[] = [];

  if (envelope.version !== ENVELOPE_VERSION) {
    errors.push(`Unsupported envelope version: ${envelope.version}`);
  }
  if (!envelope.id) {
    errors.push('Missing envelope ID');
  }
  if (!envelope.projectId) {
    errors.push('Missing project ID');
  }
  if (envelope.algorithm !== 'aes-256-gcm') {
    errors.push(`Unsupported algorithm: ${envelope.algorithm}`);
  }
  if (!envelope.iv) {
    errors.push('Missing IV');
  }
  if (!envelope.ciphertext) {
    errors.push('Missing ciphertext');
  }
  if (!envelope.kdf || envelope.kdf.algorithm !== 'pbkdf2') {
    errors.push('Invalid or missing KDF parameters');
  }
  if (envelope.kdf && envelope.kdf.iterations < MIN_KDF_ITERATIONS) {
    errors.push(`KDF iterations below minimum (${MIN_KDF_ITERATIONS})`);
  }
  if (!envelope.vectorClock || Object.keys(envelope.vectorClock).length === 0) {
    errors.push('Missing or empty vector clock');
  }
  if (envelope.plaintextSize < 0) {
    errors.push('Invalid plaintext size');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Determine whether a remote envelope should replace the local one.
 *
 * @param local   Local envelope (may be null if no local state).
 * @param remote  Remote envelope.
 * @returns True if local should be replaced with remote.
 */
export function shouldAcceptRemote(local: SyncEnvelope | null, remote: SyncEnvelope): boolean {
  if (!local) return true;
  const comparison = compareClocks(local.vectorClock, remote.vectorClock);
  return comparison === 'behind';
}
