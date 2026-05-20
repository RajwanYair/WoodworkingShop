/**
 * Sprint 54 — ErrorBoundary "Copy error details" button tests.
 *
 * Verifies:
 *  - Copy button renders in error state.
 *  - Clicking it calls navigator.clipboard.writeText with the error details.
 *  - Button label changes to "Copied!" after a successful copy.
 *  - Error message is displayed in all environments (not just DEV).
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../../src/components/layout/ErrorBoundary';

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test explosion');
  return <div>Safe</div>;
}

// Suppress the expected React error output during tests
let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
  vi.unstubAllGlobals();
});

function renderBroken(panelName?: string) {
  render(
    <ErrorBoundary panelName={panelName}>
      <Bomb shouldThrow />
    </ErrorBoundary>,
  );
}

describe('ErrorBoundary — copy error details (Sprint 54)', () => {
  it('shows the copy button in error state', () => {
    renderBroken();
    expect(screen.getByRole('button', { name: /copy error details/i })).toBeInTheDocument();
  });

  it('displays the error message in all environments', () => {
    renderBroken();
    expect(screen.getByText(/Test explosion/)).toBeInTheDocument();
  });

  it('calls navigator.clipboard.writeText when copy button is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    renderBroken();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy error details/i }));
    });

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Test explosion'));
  });

  it('button label changes to "Copied!" after successful copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    renderBroken();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy error details/i }));
    });

    expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument();
  });

  it('shows the Retry button and alert role', () => {
    renderBroken();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
