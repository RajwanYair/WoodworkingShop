import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ToastContainer } from '../../src/components/layout/ToastContainer';
import { useToastStore } from '../../src/store/toast-store';

describe('ToastContainer ARIA regions', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error toasts inside an aria-live="assertive" region', () => {
    useToastStore.setState({
      toasts: [{ id: 1, message: 'Something went wrong', type: 'error' }],
    });
    render(<ToastContainer />);
    const assertiveRegion = document.querySelector('[aria-live="assertive"]');
    expect(assertiveRegion).not.toBeNull();
    expect(assertiveRegion?.textContent).toContain('Something went wrong');
  });

  it('renders success toasts inside an aria-live="polite" region', () => {
    useToastStore.setState({
      toasts: [{ id: 2, message: 'Export complete', type: 'success' }],
    });
    render(<ToastContainer />);
    const politeRegion = document.querySelector('[aria-live="polite"]');
    expect(politeRegion).not.toBeNull();
    expect(politeRegion?.textContent).toContain('Export complete');
  });

  it('renders info toasts inside the polite region, not assertive', () => {
    useToastStore.setState({
      toasts: [{ id: 3, message: 'Tip: use plywood for shelves', type: 'info' }],
    });
    render(<ToastContainer />);
    const assertiveRegion = document.querySelector('[aria-live="assertive"]');
    expect(assertiveRegion?.textContent?.trim()).toBe('');
    const politeRegion = document.querySelector('[aria-live="polite"]');
    expect(politeRegion?.textContent).toContain('Tip:');
  });

  it('error toasts are NOT placed inside the polite region', () => {
    useToastStore.setState({
      toasts: [{ id: 4, message: 'Error!', type: 'error' }],
    });
    render(<ToastContainer />);
    const politeRegion = document.querySelector('[aria-live="polite"]');
    expect(politeRegion?.textContent?.trim()).toBe('');
  });

  it('dismiss button is accessible with aria-label', () => {
    useToastStore.setState({
      toasts: [{ id: 5, message: 'Done', type: 'success' }],
    });
    render(<ToastContainer />);
    const dismissBtn = screen.getByLabelText('Dismiss');
    expect(dismissBtn).toBeInTheDocument();
  });
});
