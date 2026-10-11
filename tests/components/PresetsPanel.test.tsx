import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { PresetsPanel } from '../../src/components/configurator/PresetsPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';

describe('PresetsPanel', () => {
  beforeEach(() => {
    const config = { ...DEFAULT_CONFIG };
    useCabinetStore.setState({ config, cabinets: [{ name: 'Cabinet 1', config }], activeCabinetIndex: 0 });
  });

  it.each([
    ['Kitchen Base', 'cabinet', 600, 720, 550, 1],
    ['Kitchen Wall Unit', 'cabinet', 600, 700, 300, 2],
    ['Tall Pantry', 'cabinet', 600, 2000, 550, 4],
    ['Bookcase', 'bookshelf', 800, 1800, 300, 5],
    ['Double Wardrobe', 'wardrobe', 1200, 2200, 600, 1],
    ['Bathroom Vanity', 'cabinet', 800, 850, 450, 0],
  ] as const)(
    'applies the %s preset to the cabinet configuration',
    async (name, furnitureType, width, height, depth, shelfCount) => {
      const user = userEvent.setup();
      render(<PresetsPanel />);

      await user.click(screen.getByRole('button', { name: new RegExp(name) }));

      expect(useCabinetStore.getState().config).toMatchObject({ furnitureType, width, height, depth, shelfCount });
    },
  );
});
