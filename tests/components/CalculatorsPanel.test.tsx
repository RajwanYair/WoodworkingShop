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
  'Shelf Sag Calculator',
  'Pocket Hole Calculator',
  'Dowel Joint Calculator',
  'Mortise & Tenon Calculator',
  'Dovetail Layout Calculator',
] as const;

describe('CalculatorsPanel', () => {
  it('expands a calculator requested from the command palette', async () => {
    render(<CalculatorsPanel request={{ id: 'shelf-deflection', sequence: 1 }} />);

    expect(await screen.findByRole('button', { name: 'Shelf Sag Calculator' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

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

  it.each(calculatorNames)('mounts %s and displays a numeric result with units when expanded', async (name) => {
    const user = userEvent.setup();
    render(<CalculatorsPanel />);

    const toggle = screen.getByRole('button', { name });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);

    const calculator = await screen.findByRole('region', { name });
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

describe('surfaced calculators', () => {
  it('recalculates shelf deflection when the span changes', async () => {
    const user = userEvent.setup();
    render(<CalculatorsPanel />);

    await user.click(screen.getByRole('button', { name: 'Shelf Sag Calculator' }));
    const panel = await screen.findByRole('region', { name: 'Shelf Sag Calculator' });
    expect(panel).toHaveTextContent('0.81 mm');
    const spanInput = screen.getByRole('spinbutton', { name: /shelf span/i });
    await user.clear(spanInput);
    await user.type(spanInput, '1000');

    expect(panel).toHaveTextContent('1.58 mm');
    expect(panel).toHaveTextContent(/recommended max span/i);
  });

  it('recalculates pocket screw count when joint length changes', async () => {
    const user = userEvent.setup();
    render(<CalculatorsPanel />);

    await user.click(screen.getByRole('button', { name: 'Pocket Hole Calculator' }));
    const panel = await screen.findByRole('region', { name: 'Pocket Hole Calculator' });
    expect(panel).toHaveTextContent('5');
    const lengthInput = screen.getByRole('spinbutton', { name: /joint length/i });
    await user.clear(lengthInput);
    await user.type(lengthInput, '1200');

    expect(panel).toHaveTextContent('9');
    expect(panel).toHaveTextContent(/drill angle/i);
  });

  it('recalculates dowel spacing when the joint length changes', async () => {
    const user = userEvent.setup();
    render(<CalculatorsPanel />);

    await user.click(screen.getByRole('button', { name: 'Dowel Joint Calculator' }));
    const panel = await screen.findByRole('region', { name: 'Dowel Joint Calculator' });
    expect(panel).toHaveTextContent('166.67 mm');
    const lengthInput = screen.getByRole('spinbutton', { name: /joint length/i });
    await user.clear(lengthInput);
    await user.type(lengthInput, '1000');

    expect(panel).toHaveTextContent('150 mm');
    expect(panel).toHaveTextContent(/drill depth/i);
  });

  it('recalculates mortise-tenon length when the joint type changes', async () => {
    const user = userEvent.setup();
    render(<CalculatorsPanel />);

    await user.click(screen.getByRole('button', { name: 'Mortise & Tenon Calculator' }));
    const panel = await screen.findByRole('region', { name: 'Mortise & Tenon Calculator' });
    expect(panel).toHaveTextContent('18 mm');
    await user.selectOptions(screen.getByRole('combobox', { name: /joint type/i }), 'blind');

    expect(panel).toHaveTextContent('32.4 mm');
    expect(panel).toHaveTextContent(/mortise depth/i);
  });

  it('recalculates dovetail widths when the tail count changes', async () => {
    const user = userEvent.setup();
    render(<CalculatorsPanel />);

    await user.click(screen.getByRole('button', { name: 'Dovetail Layout Calculator' }));
    const panel = await screen.findByRole('region', { name: 'Dovetail Layout Calculator' });
    expect(panel).toHaveTextContent('41.96 mm');
    const tailCountInput = screen.getByRole('spinbutton', { name: /number of tails/i });
    await user.clear(tailCountInput);
    await user.type(tailCountInput, '5');

    expect(panel).toHaveTextContent('33.48 mm');
    expect(panel).toHaveTextContent(/slope ratio/i);
  });
});
