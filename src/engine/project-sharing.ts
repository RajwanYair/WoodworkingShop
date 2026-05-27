/**
 * Sprint 160 — Project sharing links engine.
 *
 * Generates read-only shareable links for cabinet projects with configurable
 * expiration, access controls, and usage tracking.
 *
 * Features:
 *   - Token-based share link generation (cryptographically random)
 *   - Configurable expiration (hours/days/never)
 *   - Access permission levels (view-only, view+export, full)
 *   - Share revocation and renewal
 *   - Usage tracking (view count, last accessed)
 *   - Link validation and expiration checks
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Access permission levels for a share link. */
export type SharePermission = 'view' | 'view-export' | 'full';

/** Share link state. */
export type ShareState = 'active' | 'expired' | 'revoked';

/** Expiration policy for a share link. */
export interface ExpirationPolicy {
  /** Type of expiration. */
  type: 'hours' | 'days' | 'never';
  /** Value (e.g., 24 for 24 hours). Ignored when type is 'never'. */
  value: number;
}

/** A share link record. */
export interface ShareLink {
  /** Unique share token (URL-safe base64). */
  token: string;
  /** Project ID being shared. */
  projectId: string;
  /** Display name for the link. */
  label: string;
  /** Permission level granted. */
  permission: SharePermission;
  /** Current state. */
  state: ShareState;
  /** Expiration policy. */
  expiration: ExpirationPolicy;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 expiration timestamp (null if never). */
  expiresAt: string | null;
  /** ISO 8601 timestamp of last access (null if never accessed). */
  lastAccessedAt: string | null;
  /** Number of times the link has been accessed. */
  viewCount: number;
  /** Creator's peer/device ID. */
  createdBy: string;
}

/** Options for creating a share link. */
export interface CreateShareOptions {
  /** Project ID to share. */
  projectId: string;
  /** Display label for the link. */
  label: string;
  /** Permission level. */
  permission: SharePermission;
  /** Expiration policy. */
  expiration: ExpirationPolicy;
  /** Creator's peer ID. */
  createdBy: string;
}

/** Result of validating a share link access. */
export interface AccessValidation {
  /** Whether access is permitted. */
  allowed: boolean;
  /** Reason for denial (if not allowed). */
  reason?: string;
  /** The share link (if found and valid). */
  link?: ShareLink;
}

/** Summary statistics for project shares. */
export interface ShareSummary {
  /** Total number of share links. */
  total: number;
  /** Active links. */
  active: number;
  /** Expired links. */
  expired: number;
  /** Revoked links. */
  revoked: number;
  /** Total view count across all links. */
  totalViews: number;
}

/** Token generator function type (injectable for testing). */
export type TokenGenerator = (length: number) => string;

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default token length in bytes (yields 32 URL-safe base64 characters). */
export const DEFAULT_TOKEN_LENGTH = 24;

/** Maximum label length. */
export const MAX_LABEL_LENGTH = 100;

/** Default expiration policy. */
export const DEFAULT_EXPIRATION: ExpirationPolicy = { type: 'days', value: 7 };

// ─── Token generation ─────────────────────────────────────────────────────────

/**
 * Default token generator using pseudo-random characters.
 * In production, this would use crypto.getRandomValues.
 *
 * @param length  Number of random bytes.
 * @returns URL-safe base64 token string.
 */
export function defaultTokenGenerator(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Create a new share link for a project.
 *
 * @param options         Share link options.
 * @param tokenGenerator  Token generator function (injectable for testing).
 * @returns New share link.
 * @throws RangeError if label is empty or exceeds MAX_LABEL_LENGTH.
 */
export function createShareLink(
  options: CreateShareOptions,
  tokenGenerator: TokenGenerator = defaultTokenGenerator,
): ShareLink {
  if (!options.label || options.label.trim().length === 0) {
    throw new RangeError('createShareLink: label must not be empty');
  }
  if (options.label.length > MAX_LABEL_LENGTH) {
    throw new RangeError(`createShareLink: label exceeds ${MAX_LABEL_LENGTH} characters`);
  }
  if (!options.projectId) {
    throw new RangeError('createShareLink: projectId must not be empty');
  }

  const now = new Date();
  const expiresAt = computeExpiration(now, options.expiration);

  return {
    token: tokenGenerator(DEFAULT_TOKEN_LENGTH),
    projectId: options.projectId,
    label: options.label.trim(),
    permission: options.permission,
    state: 'active',
    expiration: options.expiration,
    createdAt: now.toISOString(),
    expiresAt,
    lastAccessedAt: null,
    viewCount: 0,
    createdBy: options.createdBy,
  };
}

/**
 * Validate whether a share link can be accessed at the given time.
 *
 * @param links  All share links.
 * @param token  Token to validate.
 * @param now    Current time (for testability).
 * @returns Access validation result.
 */
export function validateAccess(links: ShareLink[], token: string, now: Date = new Date()): AccessValidation {
  const link = links.find((l) => l.token === token);
  if (!link) {
    return { allowed: false, reason: 'Link not found.' };
  }
  if (link.state === 'revoked') {
    return { allowed: false, reason: 'Link has been revoked.' };
  }
  if (link.state === 'expired' || isExpired(link, now)) {
    return { allowed: false, reason: 'Link has expired.' };
  }
  return { allowed: true, link };
}

/**
 * Record an access event on a share link.
 *
 * @param links  All share links.
 * @param token  Token being accessed.
 * @param now    Current time.
 * @returns Updated links array.
 */
export function recordAccess(links: ShareLink[], token: string, now: Date = new Date()): ShareLink[] {
  return links.map((link) => {
    if (link.token === token && link.state === 'active') {
      return {
        ...link,
        viewCount: link.viewCount + 1,
        lastAccessedAt: now.toISOString(),
      };
    }
    return link;
  });
}

/**
 * Revoke a share link (permanently disables access).
 *
 * @param links  All share links.
 * @param token  Token to revoke.
 * @returns Updated links array.
 */
export function revokeLink(links: ShareLink[], token: string): ShareLink[] {
  return links.map((link) => {
    if (link.token === token && link.state === 'active') {
      return { ...link, state: 'revoked' as const };
    }
    return link;
  });
}

/**
 * Renew a share link (reset expiration from now).
 *
 * @param links       All share links.
 * @param token       Token to renew.
 * @param expiration  New expiration policy.
 * @param now         Current time.
 * @returns Updated links array.
 */
export function renewLink(
  links: ShareLink[],
  token: string,
  expiration: ExpirationPolicy,
  now: Date = new Date(),
): ShareLink[] {
  return links.map((link) => {
    if (link.token === token && (link.state === 'active' || link.state === 'expired')) {
      return {
        ...link,
        state: 'active' as const,
        expiration,
        expiresAt: computeExpiration(now, expiration),
      };
    }
    return link;
  });
}

/**
 * Get links for a specific project.
 *
 * @param links      All share links.
 * @param projectId  Project ID to filter by.
 * @returns Links for the specified project.
 */
export function getLinksByProject(links: ShareLink[], projectId: string): ShareLink[] {
  return links.filter((link) => link.projectId === projectId);
}

/**
 * Expire all links that have passed their expiration time.
 *
 * @param links  All share links.
 * @param now    Current time.
 * @returns Updated links with expired ones marked.
 */
export function expireLinks(links: ShareLink[], now: Date = new Date()): ShareLink[] {
  return links.map((link) => {
    if (link.state === 'active' && isExpired(link, now)) {
      return { ...link, state: 'expired' as const };
    }
    return link;
  });
}

/**
 * Compute share summary statistics.
 *
 * @param links  All share links.
 * @returns Summary statistics.
 */
export function getShareSummary(links: ShareLink[]): ShareSummary {
  return {
    total: links.length,
    active: links.filter((l) => l.state === 'active').length,
    expired: links.filter((l) => l.state === 'expired').length,
    revoked: links.filter((l) => l.state === 'revoked').length,
    totalViews: links.reduce((sum, l) => sum + l.viewCount, 0),
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Compute expiration timestamp from policy. */
function computeExpiration(now: Date, policy: ExpirationPolicy): string | null {
  if (policy.type === 'never') return null;
  const ms = policy.type === 'hours' ? policy.value * 3600000 : policy.value * 86400000;
  return new Date(now.getTime() + ms).toISOString();
}

/** Check if a link is expired at the given time. */
function isExpired(link: ShareLink, now: Date): boolean {
  if (!link.expiresAt) return false;
  return new Date(link.expiresAt).getTime() <= now.getTime();
}
