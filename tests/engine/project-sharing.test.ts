import { describe, it, expect } from 'vitest';
import {
  createShareLink,
  validateAccess,
  recordAccess,
  revokeLink,
  renewLink,
  getLinksByProject,
  expireLinks,
  getShareSummary,
  DEFAULT_TOKEN_LENGTH,
  MAX_LABEL_LENGTH,
  DEFAULT_EXPIRATION,
} from '../../src/engine/project-sharing';
import type { ShareLink, CreateShareOptions } from '../../src/engine/project-sharing';

/** Deterministic token generator for testing. */
let tokenCounter = 0;
function testTokenGenerator(length: number): string {
  tokenCounter++;
  return `test-token-${tokenCounter}`.padEnd(length, 'x');
}

function makeOptions(overrides: Partial<CreateShareOptions> = {}): CreateShareOptions {
  return {
    projectId: 'proj-1',
    label: 'My Share',
    permission: 'view',
    expiration: { type: 'days', value: 7 },
    createdBy: 'device-A',
    ...overrides,
  };
}

describe('project-sharing', () => {
  describe('createShareLink', () => {
    it('creates a valid share link with correct defaults', () => {
      const link = createShareLink(makeOptions(), testTokenGenerator);

      expect(link.token).toBeTruthy();
      expect(link.projectId).toBe('proj-1');
      expect(link.label).toBe('My Share');
      expect(link.permission).toBe('view');
      expect(link.state).toBe('active');
      expect(link.viewCount).toBe(0);
      expect(link.lastAccessedAt).toBeNull();
      expect(link.expiresAt).not.toBeNull();
      expect(link.createdBy).toBe('device-A');
    });

    it('computes expiration for hours policy', () => {
      const link = createShareLink(makeOptions({ expiration: { type: 'hours', value: 24 } }), testTokenGenerator);
      const created = new Date(link.createdAt).getTime();
      const expires = new Date(link.expiresAt!).getTime();
      expect(expires - created).toBe(24 * 3600000);
    });

    it('sets null expiration for never policy', () => {
      const link = createShareLink(makeOptions({ expiration: { type: 'never', value: 0 } }), testTokenGenerator);
      expect(link.expiresAt).toBeNull();
    });

    it.each([
      { label: '', desc: 'empty label' },
      { label: '   ', desc: 'whitespace-only label' },
    ])('throws on $desc', ({ label }) => {
      expect(() => createShareLink(makeOptions({ label }), testTokenGenerator)).toThrow('label must not be empty');
    });

    it('throws on label exceeding max length', () => {
      const longLabel = 'x'.repeat(MAX_LABEL_LENGTH + 1);
      expect(() => createShareLink(makeOptions({ label: longLabel }), testTokenGenerator)).toThrow(
        `label exceeds ${MAX_LABEL_LENGTH}`,
      );
    });

    it('throws on empty projectId', () => {
      expect(() => createShareLink(makeOptions({ projectId: '' }), testTokenGenerator)).toThrow(
        'projectId must not be empty',
      );
    });
  });

  describe('validateAccess', () => {
    it('allows access to active non-expired link', () => {
      const link = createShareLink(makeOptions(), testTokenGenerator);
      const result = validateAccess([link], link.token);
      expect(result.allowed).toBe(true);
      expect(result.link).toBeDefined();
    });

    it('denies access when token not found', () => {
      const result = validateAccess([], 'nonexistent');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('denies access to revoked link', () => {
      const link = createShareLink(makeOptions(), testTokenGenerator);
      const revoked = revokeLink([link], link.token);
      const result = validateAccess(revoked, link.token);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('revoked');
    });

    it('denies access to expired link', () => {
      const link = createShareLink(makeOptions({ expiration: { type: 'hours', value: 1 } }), testTokenGenerator);
      const futureDate = new Date(Date.now() + 2 * 3600000); // 2 hours later
      const result = validateAccess([link], link.token, futureDate);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('allows access to never-expiring link far in the future', () => {
      const link = createShareLink(makeOptions({ expiration: { type: 'never', value: 0 } }), testTokenGenerator);
      const farFuture = new Date('2099-01-01');
      const result = validateAccess([link], link.token, farFuture);
      expect(result.allowed).toBe(true);
    });
  });

  describe('recordAccess', () => {
    it('increments view count and sets lastAccessedAt', () => {
      const link = createShareLink(makeOptions(), testTokenGenerator);
      const now = new Date('2026-06-15T10:00:00Z');
      const updated = recordAccess([link], link.token, now);

      expect(updated[0].viewCount).toBe(1);
      expect(updated[0].lastAccessedAt).toBe('2026-06-15T10:00:00.000Z');
    });

    it('does not update revoked links', () => {
      const link = createShareLink(makeOptions(), testTokenGenerator);
      const revoked = revokeLink([link], link.token);
      const updated = recordAccess(revoked, link.token);

      expect(updated[0].viewCount).toBe(0);
    });
  });

  describe('revokeLink', () => {
    it('marks active link as revoked', () => {
      const link = createShareLink(makeOptions(), testTokenGenerator);
      const updated = revokeLink([link], link.token);
      expect(updated[0].state).toBe('revoked');
    });

    it('does not revoke already-expired links', () => {
      const link: ShareLink = {
        ...createShareLink(makeOptions(), testTokenGenerator),
        state: 'expired',
      };
      const updated = revokeLink([link], link.token);
      expect(updated[0].state).toBe('expired');
    });
  });

  describe('renewLink', () => {
    it('renews an expired link with new expiration', () => {
      const link: ShareLink = {
        ...createShareLink(makeOptions(), testTokenGenerator),
        state: 'expired',
      };
      const now = new Date('2026-06-20T00:00:00Z');
      const updated = renewLink([link], link.token, { type: 'days', value: 30 }, now);

      expect(updated[0].state).toBe('active');
      expect(updated[0].expiration.value).toBe(30);
      expect(updated[0].expiresAt).not.toBeNull();
    });

    it('does not renew revoked links', () => {
      const link: ShareLink = {
        ...createShareLink(makeOptions(), testTokenGenerator),
        state: 'revoked',
      };
      const updated = renewLink([link], link.token, { type: 'days', value: 7 });
      expect(updated[0].state).toBe('revoked');
    });
  });

  describe('getLinksByProject', () => {
    it('filters links by project ID', () => {
      const link1 = createShareLink(makeOptions({ projectId: 'proj-1' }), testTokenGenerator);
      const link2 = createShareLink(makeOptions({ projectId: 'proj-2' }), testTokenGenerator);
      const link3 = createShareLink(makeOptions({ projectId: 'proj-1' }), testTokenGenerator);

      const result = getLinksByProject([link1, link2, link3], 'proj-1');
      expect(result).toHaveLength(2);
      expect(result.every((l) => l.projectId === 'proj-1')).toBe(true);
    });
  });

  describe('expireLinks', () => {
    it('marks past-due active links as expired', () => {
      const link = createShareLink(makeOptions({ expiration: { type: 'hours', value: 1 } }), testTokenGenerator);
      const future = new Date(Date.now() + 2 * 3600000);
      const updated = expireLinks([link], future);
      expect(updated[0].state).toBe('expired');
    });

    it('does not expire never-expiring links', () => {
      const link = createShareLink(makeOptions({ expiration: { type: 'never', value: 0 } }), testTokenGenerator);
      const future = new Date('2099-01-01');
      const updated = expireLinks([link], future);
      expect(updated[0].state).toBe('active');
    });
  });

  describe('getShareSummary', () => {
    it('computes correct statistics', () => {
      const active = createShareLink(makeOptions(), testTokenGenerator);
      const expired: ShareLink = { ...createShareLink(makeOptions(), testTokenGenerator), state: 'expired' };
      const revoked: ShareLink = { ...createShareLink(makeOptions(), testTokenGenerator), state: 'revoked' };
      const viewed: ShareLink = { ...createShareLink(makeOptions(), testTokenGenerator), viewCount: 5 };

      const summary = getShareSummary([active, expired, revoked, viewed]);
      expect(summary.total).toBe(4);
      expect(summary.active).toBe(2); // active + viewed
      expect(summary.expired).toBe(1);
      expect(summary.revoked).toBe(1);
      expect(summary.totalViews).toBe(5);
    });
  });

  describe('constants', () => {
    it('DEFAULT_TOKEN_LENGTH is 24', () => {
      expect(DEFAULT_TOKEN_LENGTH).toBe(24);
    });

    it('DEFAULT_EXPIRATION is 7 days', () => {
      expect(DEFAULT_EXPIRATION).toEqual({ type: 'days', value: 7 });
    });
  });
});
