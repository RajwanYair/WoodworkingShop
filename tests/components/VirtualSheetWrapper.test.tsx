import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VirtualSheetWrapper } from '../../src/components/optimizer/VirtualSheetWrapper';

describe('VirtualSheetWrapper', () => {
  let observerCallback: IntersectionObserverCallback | null = null;
  let observeStub: ReturnType<typeof vi.fn>;
  let disconnectStub: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observeStub = vi.fn();
    disconnectStub = vi.fn();

    // IntersectionObserver must be a constructor — use a class expression
    class MockIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }
      observe = observeStub;
      disconnect = disconnectStub;
      unobserve = vi.fn();
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    observerCallback = null;
  });

  it('renders the outer wrapper with data-testid', () => {
    render(<VirtualSheetWrapper><div>Content</div></VirtualSheetWrapper>);
    expect(screen.getByTestId('virtual-sheet-wrapper')).toBeInTheDocument();
  });

  it('shows placeholder (not children) before intersection', () => {
    render(<VirtualSheetWrapper><div data-testid="real-content">Content</div></VirtualSheetWrapper>);
    expect(screen.queryByTestId('real-content')).not.toBeInTheDocument();
    // Placeholder has data-testid
    expect(screen.getByTestId('virtual-sheet-placeholder')).toBeInTheDocument();
  });

  it('renders children after intersection fires', () => {
    render(<VirtualSheetWrapper><div data-testid="real-content">Content</div></VirtualSheetWrapper>);
    expect(screen.queryByTestId('real-content')).not.toBeInTheDocument();

    act(() => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(screen.getByTestId('real-content')).toBeInTheDocument();
  });

  it('disconnects observer after becoming visible (keepMounted)', () => {
    render(<VirtualSheetWrapper><div>Content</div></VirtualSheetWrapper>);

    act(() => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(disconnectStub).toHaveBeenCalled();
  });

  it('calls observe on mount', () => {
    render(<VirtualSheetWrapper><div>Content</div></VirtualSheetWrapper>);
    expect(observeStub).toHaveBeenCalled();
  });

  it('accepts custom placeholderHeight', () => {
    render(<VirtualSheetWrapper placeholderHeight={300}><div>Content</div></VirtualSheetWrapper>);
    expect(screen.getByTestId('virtual-sheet-placeholder')).toHaveStyle({ height: '300px' });
  });
});
