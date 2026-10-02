/**
 * Sprint 54 — ErrorBoundary "Copy error details" button tests.
 *
 * Verifies:
 *  - Copy button renders in error state.
 *  - Clicking it calls navigator.clipboard.writeText with the error details.
 *  - Button label changes to "Copied!" after a successful copy.
 *  - Error message is displayed in all environments (not just DEV).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../../src/components/layout/ErrorBoundary';
import { renderWithLocale } from '../render-with-locale';

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

function CrashablePanel({ shouldThrow, panelName }: { shouldThrow: boolean; panelName: string }) {
  if (shouldThrow) throw new Error(`${panelName} crashed`);
  return <div>{panelName} recovered</div>;
}

function RecoverablePanel({ panelName }: { panelName: string }) {
  const [shouldThrow, setShouldThrow] = useState(true);
  return (
    <>
      <ErrorBoundary panelName={panelName}>
        <CrashablePanel shouldThrow={shouldThrow} panelName={panelName} />
      </ErrorBoundary>
      <button type="button" onClick={() => setShouldThrow(false)}>
        Repair test panel
      </button>
      <p>Healthy sibling</p>
    </>
  );
}

describe('ErrorBoundary — copy error details (Sprint 54)', () => {
  it('shows the copy button in error state', () => {
    renderBroken();
    expect(screen.getByRole('button', { name: /copy error details/i })).toBeInTheDocument();
  }, 15000);

  it('displays the error message in all environments', () => {
    renderBroken();
    expect(screen.getByText(/Test explosion/)).toBeInTheDocument();
  });

  it('calls navigator.clipboard.writeText when copy button is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    renderBroken();
    fireEvent.click(screen.getByRole('button', { name: /copy error details/i }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Test explosion'));
  });

  it('button label changes to "Copied!" after successful copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    renderBroken();
    fireEvent.click(screen.getByRole('button', { name: /copy error details/i }));

    expect(await screen.findByRole('button', { name: /copied!/i })).toBeInTheDocument();
  });

  it('shows the Retry button and alert role', () => {
    renderBroken();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it.each([
    'Configurator',
    'Preview',
    'Interactive 3D preview',
    'Optimizer',
    'Assembly Guide',
    'PDF Export',
    'Calculators',
  ])('isolates and recovers the %s panel without disturbing its sibling', async (panelName) => {
    await renderWithLocale(<RecoverablePanel panelName={panelName} />);

    expect(screen.getByRole('alert')).toHaveTextContent(`${panelName} failed to render`);
    expect(screen.getByText('Healthy sibling')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Repair test panel' }));
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(screen.getByText(`${panelName} recovered`)).toBeInTheDocument();
    expect(screen.getByText('Healthy sibling')).toBeInTheDocument();
  });

  it('localizes the fallback alert and recovery controls in Hebrew', async () => {
    await renderWithLocale(
      <ErrorBoundary panelName="אופטימיזציה">
        <CrashablePanel shouldThrow panelName="אופטימיזציה" />
      </ErrorBoundary>,
      'he',
    );

    expect(screen.getByRole('alert')).toHaveTextContent('לא ניתן להציג את החלונית: אופטימיזציה');
    expect(screen.getByText(/אירעה שגיאה בלתי צפויה/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'נסה שוב' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'טען מחדש את הדף' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'פרטי שגיאה' })).toBeInTheDocument();
  });
});
