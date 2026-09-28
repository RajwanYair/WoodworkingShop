import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIntersectionVisible } from '../../src/hooks/useIntersectionVisible';

function VisibleContent({ keepMounted = true }: { keepMounted?: boolean }) {
  const { ref, isVisible } = useIntersectionVisible({ keepMounted, rootMargin: '0px' });
  return <div ref={ref}>{isVisible ? 'Visible' : 'Placeholder'}</div>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useIntersectionVisible', () => {
  it('renders content when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    render(<VisibleContent />);

    expect(screen.getByText('Visible')).toBeInTheDocument();
  });

  it('observes the element and updates visibility without unmounting observation', () => {
    let callback: IntersectionObserverCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    class ObserverStub {
      constructor(next: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        callback = next;
        expect(options?.rootMargin).toBe('0px');
      }
      observe = observe;
      disconnect = disconnect;
    }
    vi.stubGlobal('IntersectionObserver', ObserverStub);

    render(<VisibleContent keepMounted={false} />);
    expect(screen.getByText('Placeholder')).toBeInTheDocument();
    expect(observe).toHaveBeenCalledOnce();

    act(() => callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.getByText('Visible')).toBeInTheDocument();

    act(() => callback?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.getByText('Placeholder')).toBeInTheDocument();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('disconnects after first intersection when keepMounted is enabled', () => {
    let callback: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    class ObserverStub {
      constructor(next: IntersectionObserverCallback) {
        callback = next;
      }
      observe(): void {}
      disconnect = disconnect;
    }
    vi.stubGlobal('IntersectionObserver', ObserverStub);

    render(<VisibleContent />);
    act(() => callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));

    expect(screen.getByText('Visible')).toBeInTheDocument();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
