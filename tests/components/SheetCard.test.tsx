import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SheetCard } from '../../src/components/optimizer/SheetCard';
import { useCustomMaterialsStore } from '../../src/store/custom-materials-store';
import { makeCutSheet, makeMaterial } from '../helpers';

describe('SheetCard', () => {
  beforeEach(() => {
    useCustomMaterialsStore.setState({ materials: [] });
  });

  it('formats waste cost using the selected locale', () => {
    useCustomMaterialsStore.setState({
      materials: [makeMaterial({ key: 'locale-test', pricePerSheet: 2000 })],
    });
    const sheet = makeCutSheet({
      material: 'locale-test',
      yieldPercent: 25,
    });
    const formatWasteCost = new Intl.NumberFormat('he', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(1_500);

    render(
      <SheetCard
        sheet={sheet}
        lang="he"
        hoveredPartId={null}
        onHoverPart={vi.fn()}
        colorBlindMode={false}
        showPartNames={false}
        showGrainHatch={false}
        filePrefix="test"
        partFilter=""
        onGcodePreview={vi.fn()}
        rotationLockedPartIds={{}}
        onToggleRotationLock={vi.fn()}
        t={(key, options) => (key === 'optimizer.sheetWasteCost' ? `Waste cost: ₪${String(options?.cost)}` : key)}
      />,
    );

    expect(screen.getByText(`Waste cost: ₪${formatWasteCost}`)).toBeInTheDocument();
  });
});
