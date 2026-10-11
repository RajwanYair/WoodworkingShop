import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { OptimizerExplainerPanel } from '../../src/components/optimizer/OptimizerExplainerPanel';
import { makeCutRect, makeCutSheet } from '../helpers';

const messages: Record<string, string> = {
  'optimizer.explainer.title': 'Why this layout?',
  'optimizer.explainer.qualityExcellent': 'Excellent',
  'optimizer.explainer.qualityGood': 'Good',
  'optimizer.explainer.qualityFair': 'Fair',
  'optimizer.explainer.algorithm': 'MaxRects placement explanation',
  'optimizer.explainer.placedParts': '{{total}} parts placed across {{sheets}} sheet(s)',
  'optimizer.explainer.rotatedParts': '{{count}} part(s) rotated',
  'optimizer.explainer.grainLocked': '{{count}} part(s) kept upright',
  'optimizer.explainer.yieldResult': 'Average yield: {{yield}}%',
};

function translate(key: string, options?: Record<string, unknown>): string {
  return Object.entries(options ?? {}).reduce(
    (message, [name, value]) => message.replace(`{{${name}}}`, String(value)),
    messages[key] ?? key,
  );
}

describe('OptimizerExplainerPanel', () => {
  it('renders nothing when there are no sheets', () => {
    const { container } = render(<OptimizerExplainerPanel sheets={[]} t={translate} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('explains placement, rotation, grain, and average yield statistics', async () => {
    const user = userEvent.setup();
    const sheet = makeCutSheet({
      parts: [makeCutRect({ rotated: true }), makeCutRect({ partId: 'P02', rotated: false, grainVertical: false })],
      yieldPercent: 70,
    });
    render(<OptimizerExplainerPanel sheets={[sheet]} t={translate} />);

    const toggle = screen.getByRole('button', { name: /Why this layout\?/ });
    expect(toggle).toHaveTextContent('Good');
    await user.click(toggle);

    expect(screen.getByText('MaxRects placement explanation')).toBeInTheDocument();
    expect(screen.getByText('2 parts placed across 1 sheet(s)')).toBeInTheDocument();
    expect(screen.getByText('1 part(s) rotated')).toBeInTheDocument();
    expect(screen.getByText('1 part(s) kept upright')).toBeInTheDocument();
    expect(screen.getByText('Average yield: 70%')).toBeInTheDocument();
  });
});
