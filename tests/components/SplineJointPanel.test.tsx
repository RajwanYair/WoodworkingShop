import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SplineJointPanel } from '../../src/components/configurator/SplineJointPanel';

describe('SplineJointPanel', () => {
  it('scales total spline length and glue area and reports an over-deep slot', async () => {
    const user = userEvent.setup();
    render(<SplineJointPanel />);

    const panel = screen.getByRole('region', { name: /spline joint/i });
    const splineCount = screen.getByLabelText(/number of splines/i);
    await user.clear(splineCount);
    await user.type(splineCount, '3');

    expect(panel).toHaveTextContent('360.0 mm');
    expect(panel).toHaveTextContent('8640 mm²');

    const slotDepth = screen.getByLabelText(/slot depth per board/i);
    await user.clear(slotDepth);
    await user.type(slotDepth, '19');
    expect(screen.getByRole('alert')).toHaveTextContent('slotDepthPerBoardMm must be < boardThicknessMm');
  });
});
