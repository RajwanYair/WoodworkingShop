import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { StorageQuotaBadge } from '../../src/components/layout/StorageQuotaBadge';
import type { StorageEstimate } from '../../src/utils/indexed-db-storage';

// ── Mock indexed-db-storage so the component never touches IndexedDB ──────
vi.mock('../../src/utils/indexed-db-storage', () => ({
  getStorageEstimate: vi.fn(),
}));

// eslint is happy — named import used for type only above; the default export
// is the mocked function accessed via `vi.mocked` below.
import { getStorageEstimate } from '../../src/utils/indexed-db-storage';

const mockEstimate = vi.mocked(getStorageEstimate);

function makeEstimate(override: Partial<StorageEstimate> = {}): StorageEstimate {
  return {
    usedBytes: 50 * 1024 * 1024,
    quotaBytes: 200 * 1024 * 1024,
    usedKb: 51200,
    quotaMb: 200,
    percentUsed: 25,
    nearLimit: false,
    ...override,
  };
}

describe('StorageQuotaBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing while estimate is loading', () => {
    // Never resolves during this tick
    mockEstimate.mockReturnValue(new Promise(() => {}));
    const { container } = render(<StorageQuotaBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when quotaBytes is 0', async () => {
    mockEstimate.mockResolvedValue(makeEstimate({ quotaBytes: 0, usedBytes: 0 }));
    render(<StorageQuotaBadge />);
    await waitFor(() => {
      // quotaBytes=0 means the component returns null — no role="status" element
      expect(screen.queryByRole('status')).toBeNull();
    });
  });

  it('renders a status badge after estimate resolves', async () => {
    mockEstimate.mockResolvedValue(makeEstimate({ usedKb: 2048, quotaMb: 500 }));
    render(<StorageQuotaBadge />);
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  it('applies amber styling when nearLimit is true', async () => {
    mockEstimate.mockResolvedValue(
      makeEstimate({ nearLimit: true, percentUsed: 85, usedKb: 170000, quotaMb: 200 }),
    );
    render(<StorageQuotaBadge />);
    await waitFor(() => {
      const badge = screen.getByRole('status');
      expect(badge.className).toMatch(/amber/);
    });
  });

  it('does NOT apply amber styling when storage is normal', async () => {
    mockEstimate.mockResolvedValue(makeEstimate({ nearLimit: false, percentUsed: 30 }));
    render(<StorageQuotaBadge />);
    await waitFor(() => {
      const badge = screen.getByRole('status');
      expect(badge.className).not.toMatch(/amber/);
    });
  });

  it('shows ⚠ warning icon when nearLimit is true', async () => {
    mockEstimate.mockResolvedValue(
      makeEstimate({ nearLimit: true, percentUsed: 85, usedKb: 170000, quotaMb: 200 }),
    );
    render(<StorageQuotaBadge />);
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('⚠');
    });
  });

  it('does NOT show ⚠ icon when storage is safe', async () => {
    mockEstimate.mockResolvedValue(makeEstimate({ nearLimit: false, percentUsed: 25 }));
    render(<StorageQuotaBadge />);
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).not.toContain('⚠');
    });
  });

  it('calls getStorageEstimate once on mount', async () => {
    mockEstimate.mockResolvedValue(makeEstimate());
    render(<StorageQuotaBadge />);
    await waitFor(() => {
      expect(mockEstimate).toHaveBeenCalledTimes(1);
    });
  });

  it('re-polls on 30-second interval via fake timers', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockEstimate.mockResolvedValue(makeEstimate());
    render(<StorageQuotaBadge />);
    await act(async () => { await Promise.resolve(); });
    expect(mockEstimate).toHaveBeenCalledTimes(1);

    await act(async () => { vi.advanceTimersByTime(30_000); await Promise.resolve(); });
    expect(mockEstimate).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
