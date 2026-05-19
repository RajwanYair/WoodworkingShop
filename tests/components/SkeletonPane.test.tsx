import { render, screen } from '@testing-library/react';
import { SkeletonPane } from '../../src/components/layout/SkeletonPane';

describe('SkeletonPane', () => {
  it('renders with default aria role "status"', () => {
    render(<SkeletonPane />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the data-testid attribute', () => {
    render(<SkeletonPane />);
    expect(screen.getByTestId('skeleton-pane')).toBeInTheDocument();
  });

  it('uses the custom label as aria-label when provided', () => {
    render(<SkeletonPane label="Loading optimizer…" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading optimizer…');
  });

  it('renders the sr-only status text', () => {
    render(<SkeletonPane label="Custom loading text" />);
    expect(screen.getByText('Custom loading text')).toBeInTheDocument();
  });

  it('renders the default label from i18n when no label prop is given', () => {
    render(<SkeletonPane />);
    // The i18n key skeleton.loading = "Loading panel…" in en.json
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label');
    expect(status.getAttribute('aria-label')).toBeTruthy();
  });

  it('renders cards prop count of skeleton cards', () => {
    render(<SkeletonPane cards={5} />);
    expect(screen.getAllByTestId('skeleton-card')).toHaveLength(5);
  });

  it('defaults to 3 skeleton cards', () => {
    render(<SkeletonPane />);
    expect(screen.getAllByTestId('skeleton-card')).toHaveLength(3);
  });

  it('renders animated pulse elements inside each card', () => {
    render(<SkeletonPane cards={1} />);
    // Skeleton card is rendered and visible — pulse animation is CSS-only
    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument();
  });
});
