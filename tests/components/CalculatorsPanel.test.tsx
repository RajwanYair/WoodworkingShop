import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { CalculatorsPanel } from '../../src/components/configurator/CalculatorsPanel';
import { FaceFramePanel } from '../../src/components/configurator/FaceFramePanel';
import { FinishCalculatorPanel } from '../../src/components/configurator/FinishCalculatorPanel';

const calculatorNames = [
  'Finish Calculator',
  'Face Frame Calculator',
  'Cabinet Door Sizing Calculator',
  'Drawer Box Sizing Calculator',
  'Screw Pull-Out Strength Estimator',
  'Kerf Bending Calculator',
  'Dado / Rabbet Joint Calculator',
  'Finishing Coat Calculator',
  'Wood Turning Speed Calculator',
  'Frame and Panel Calculator',
  'Taper Jig Calculator',
  'Stair Stringer Calculator',
  'Box Joint Calculator',
  'Wood Glue Coverage Calculator',
  'Lumber Planer Pass Calculator',
  'Honing Guide Calculator',
  'Crown Moulding Cut Calculator',
  'Router Circle Jig Calculator',
  'Cove Cut (Table Saw)',
  'Moisture Content & Shrinkage',
  'Rafter Length & Birdsmouth',
  'Router Template Offset',
  'Half-Lap Joint',
  'Spline Joint',
] as const;

describe('CalculatorsPanel', () => {
  it('starts collapsed and expands only selected calculator on demand', async () => {
    const user = userEvent.setup();
    render(<CalculatorsPanel />);

    const toggles = screen.getAllByRole('button').filter((button) => button.hasAttribute('aria-expanded'));
    expect(toggles.length).toBeGreaterThan(0);
    toggles.forEach((toggle) => expect(toggle.getAttribute('aria-expanded')).toBe('false'));
    expect(screen.queryByLabelText(/finish type/i)).not.toBeInTheDocument();

    const finishToggle = screen.getByRole('button', { name: /finish calculator/i });
    await user.click(finishToggle);
    expect(finishToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText(/finish type/i)).toBeInTheDocument();

    const faceFrameToggle = screen.getByRole('button', { name: /face frame calculator/i });
    await user.click(faceFrameToggle);
    expect(faceFrameToggle).toHaveAttribute('aria-expanded', 'true');

    const expandedToggles = screen.getAllByRole('button').filter((button) => {
      return button.getAttribute('aria-expanded') === 'true';
    });
    expect(expandedToggles.length).toBe(2);

    await user.click(finishToggle);
    expect(finishToggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands the calculator requested by a palette command', () => {
    render(<CalculatorsPanel requestedSection={{ id: 'finish', request: 1 }} />);

    expect(screen.getByRole('button', { name: /finish calculator/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText(/finish type/i)).toBeInTheDocument();
  });

  it.each(calculatorNames)('mounts %s and displays a numeric result with units when expanded', async (name) => {
    const user = userEvent.setup();
    render(<CalculatorsPanel />);

    const toggle = screen.getByRole('button', { name });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);

    const calculator = screen.getByRole('region', { name });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(calculator).not.toHaveAttribute('role', 'alert');
    expect(calculator).toHaveTextContent(/\d/);
    expect(calculator).toHaveTextContent(/(?:mm|cm|m[²³]|rpm|[mL°%])/i);
  });
});

describe('FinishCalculatorPanel', () => {
  it('updates the selected finish, recommended coats, and required volume', async () => {
    const user = userEvent.setup();
    render(<FinishCalculatorPanel />);

    const paintButton = screen.getByRole('button', { name: 'Paint' });
    const varnishButton = screen.getByRole('button', { name: 'Varnish' });
    const initialLitres = screen.getByText(/^\d+\.\d{2}\s*L$/).textContent;
    expect(paintButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(varnishButton);

    expect(varnishButton).toHaveAttribute('aria-pressed', 'true');
    expect(paintButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Coats')).toHaveValue('3');
    expect(screen.getByText(/^\d+\.\d{2}\s*L$/).textContent).not.toBe(initialLitres);
  });
});

describe('FaceFramePanel', () => {
  it('recalculates opening width for edited dimensions and reports invalid input', async () => {
    const user = userEvent.setup();
    render(<FaceFramePanel />);

    const panel = screen.getByRole('region', { name: 'Face Frame Calculator' });
    expect(panel).toHaveTextContent('524.0 mm');
    expect(panel).not.toHaveTextContent('Middle Rail');

    const width = screen.getByRole('spinbutton', { name: /cabinet width/i });
    await user.clear(width);
    await user.type(width, '700');
    expect(panel).toHaveTextContent('624.0 mm');

    await user.clear(width);
    await user.type(width, '0');

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(panel).not.toHaveTextContent('624.0 mm');
  });
});
