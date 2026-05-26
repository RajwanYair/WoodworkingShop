/**
 * crdt-sync.ts
 *
 * Pure-TypeScript CRDT (Conflict-free Replicated Data Type) engine for
 * real-time collaboration presence and state synchronisation.
 *
 * Design: Last-Write-Wins register (LWW-Register) per field, with Lamport
 * timestamps to establish a total order across peers. No external deps.
 * The network/WebRTC transport lives outside this module (hooks / services).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Lamport logical clock — a monotonically increasing integer per peer.
 * A pair (counter, peerId) gives a deterministic total order.
 */
export interface LamportStamp {
  /** Logical clock value. */
  counter: number;
  /** Unique peer identifier (UUID or any opaque string). */
  peerId: string;
}

/**
 * A single field-level LWW operation emitted by a peer.
 * Operations are the atomic unit exchanged between peers.
 */
export interface CrdtOperation {
  /** Unique operation identifier (deterministic: `${peerId}:${counter}`). */
  id: string;
  /** Lamport timestamp at the moment the operation was created. */
  stamp: LamportStamp;
  /** Dotted-path key of the field being updated (e.g. `"config.width"`). */
  field: string;
  /** Serialised new value. Use `null` to represent deletion. */
  value: unknown;
}

/**
 * Per-field LWW register: stores the winning operation for a given field.
 */
export interface LwwRegister {
  /** The operation that currently holds the winning value. */
  op: CrdtOperation;
}

/**
 * Full CRDT state snapshot — a map from field path to its winning register.
 */
export type CrdtState = Record<string, LwwRegister>;

/**
 * Presence cursor — ephemeral peer metadata broadcast alongside operations.
 */
export interface PresencePeer {
  /** Peer's unique ID. */
  peerId: string;
  /** Human-readable display name. */
  displayName: string;
  /** Current logical clock of this peer. */
  counter: number;
  /** Wall-clock timestamp of the last received message (ms since epoch). */
  lastSeenMs: number;
  /** Optional UI colour hex for cursor rendering (e.g. `"#e63946"`). */
  colour?: string;
}

/**
 * Collaborative session state — CRDT field registers + live peer list.
 */
export interface CollabState {
  /** Local peer identifier. */
  localPeerId: string;
  /** Current Lamport counter for the local peer. */
  localCounter: number;
  /** Field-level LWW state. */
  registers: CrdtState;
  /** Known peers (including self). */
  peers: Record<string, PresencePeer>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compare two Lamport stamps for total order.
 * Returns negative if `a` happened before `b`, positive if after, 0 if equal.
 *
 * Tie-break: lexicographic peerId comparison for determinism.
 */
function compareStamps(a: LamportStamp, b: LamportStamp): number {
  if (a.counter !== b.counter) return a.counter - b.counter;
  return a.peerId < b.peerId ? -1 : a.peerId > b.peerId ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new blank collaboration session for the given peer.
 *
 * @param localPeerId - Unique identifier for this peer.
 * @param displayName - Human-readable name shown to remote peers.
 * @returns Initial {@link CollabState}.
 * @throws {RangeError} If `localPeerId` is an empty string.
 */
export function createCollabState(localPeerId: string, displayName: string): CollabState {
  if (!localPeerId) {
    throw new RangeError('createCollabState: localPeerId must not be empty');
  }
  const self: PresencePeer = {
    peerId: localPeerId,
    displayName,
    counter: 0,
    lastSeenMs: Date.now(),
  };
  return {
    localPeerId,
    localCounter: 0,
    registers: {},
    peers: { [localPeerId]: self },
  };
}

/**
 * Increment the local Lamport counter and return an updated state.
 * Call this before creating any new operation.
 *
 * @param state - Current collab state.
 * @returns New state with `localCounter` incremented by 1.
 */
export function incrementClock(state: CollabState): CollabState {
  const next = state.localCounter + 1;
  return {
    ...state,
    localCounter: next,
    peers: {
      ...state.peers,
      [state.localPeerId]: {
        ...state.peers[state.localPeerId],
        counter: next,
      },
    },
  };
}

/**
 * Build a new {@link CrdtOperation} for the local peer.
 * The caller is responsible for calling {@link incrementClock} first.
 *
 * @param state - Current collab state (counter must already be incremented).
 * @param field - Dotted field path (e.g. `"config.width"`).
 * @param value - New serialisable value for the field.
 * @returns New operation ready to apply locally and broadcast.
 * @throws {RangeError} If `field` is an empty string.
 */
export function createOperation(state: CollabState, field: string, value: unknown): CrdtOperation {
  if (!field) {
    throw new RangeError('createOperation: field must not be empty');
  }
  const stamp: LamportStamp = {
    counter: state.localCounter,
    peerId: state.localPeerId,
  };
  return {
    id: `${state.localPeerId}:${state.localCounter}`,
    stamp,
    field,
    value,
  };
}

/**
 * Apply a {@link CrdtOperation} to the CRDT state using LWW semantics.
 * Also advances the local counter if the incoming stamp is newer (Lamport rule).
 *
 * @param state - Current collab state.
 * @param op - The operation to apply.
 * @returns Updated state (immutable — a new object is returned).
 */
export function applyOperation(state: CollabState, op: CrdtOperation): CollabState {
  // Lamport clock advance: max(local, incoming) + 1
  const newCounter = Math.max(state.localCounter, op.stamp.counter) + 1;

  // LWW: only overwrite if incoming op is strictly newer than the current winner
  const existing = state.registers[op.field];
  const dominated = existing !== undefined && compareStamps(existing.op.stamp, op.stamp) >= 0;

  const newRegisters: CrdtState = dominated ? state.registers : { ...state.registers, [op.field]: { op } };

  // Update peer presence entry
  const existingPeer = state.peers[op.stamp.peerId];
  const updatedPeer: PresencePeer = existingPeer
    ? { ...existingPeer, counter: op.stamp.counter, lastSeenMs: Date.now() }
    : {
        peerId: op.stamp.peerId,
        displayName: op.stamp.peerId,
        counter: op.stamp.counter,
        lastSeenMs: Date.now(),
      };

  return {
    ...state,
    localCounter: newCounter,
    registers: newRegisters,
    peers: { ...state.peers, [op.stamp.peerId]: updatedPeer },
  };
}

/**
 * Merge two {@link CrdtState} register maps into one.
 * For each field, the register with the higher Lamport stamp wins.
 *
 * @param a - First state.
 * @param b - Second state.
 * @returns Merged state where every field holds its LWW winner.
 */
export function mergeStates(a: CrdtState, b: CrdtState): CrdtState {
  const merged: CrdtState = { ...a };
  for (const [field, regB] of Object.entries(b)) {
    const regA = merged[field];
    if (!regA || compareStamps(regA.op.stamp, regB.op.stamp) < 0) {
      merged[field] = regB;
    }
  }
  return merged;
}

/**
 * Extract all current field values from a CRDT state as a plain record.
 * Useful for hydrating the Zustand store from a remote snapshot.
 *
 * @param state - The CRDT state to read.
 * @returns A record mapping field paths to their current (winner) values.
 */
export function readValues(state: CrdtState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [field, reg] of Object.entries(state)) {
    out[field] = reg.op.value;
  }
  return out;
}

/**
 * Remove peers from presence whose last-seen timestamp is older than
 * `timeoutMs` milliseconds ago.
 *
 * @param state - Current collab state.
 * @param timeoutMs - Staleness threshold in milliseconds (default 30000).
 * @returns Updated state with stale peers removed (local peer is never removed).
 * @throws {RangeError} If `timeoutMs` ≤ 0.
 */
export function evictStalePeers(state: CollabState, timeoutMs = 30000): CollabState {
  if (timeoutMs <= 0) {
    throw new RangeError(`evictStalePeers: timeoutMs must be > 0, got ${timeoutMs}`);
  }
  const now = Date.now();
  const filtered: Record<string, PresencePeer> = {};
  for (const [id, peer] of Object.entries(state.peers)) {
    if (id === state.localPeerId || now - peer.lastSeenMs < timeoutMs) {
      filtered[id] = peer;
    }
  }
  return { ...state, peers: filtered };
}
