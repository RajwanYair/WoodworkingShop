/** Example projects — ordinary multi-cabinet project files shown in the examples gallery. */
import type { CabinetConfig } from '../core/contracts/index';
import { DEFAULT_CONFIG, BOOKSHELF_DEFAULTS, WARDROBE_DEFAULTS } from '../materials/catalog/index';

export interface ExampleCabinet {
  name: string;
  config: CabinetConfig;
}

export interface ExampleProject {
  id: string;
  cabinets: readonly ExampleCabinet[];
}

function cabinet(name: string, overrides: Partial<CabinetConfig>): ExampleCabinet {
  return { name, config: { ...DEFAULT_CONFIG, ...overrides } };
}

export const EXAMPLE_PROJECTS: readonly ExampleProject[] = [
  {
    id: 'kitchenBaseRun',
    cabinets: [
      cabinet('Left Base Cabinet', {
        furnitureType: 'cabinet',
        width: 600,
        height: 850,
        depth: 560,
        shelfCount: 1,
        doorCount: 2,
        doorStyle: 'flat',
        handleStyle: 'bar',
        kickHeight: 100,
        carcassMaterial: 'melamine-16',
        backPanelMaterial: 'mdf-3',
      }),
      cabinet('Sink Base Cabinet', {
        furnitureType: 'cabinet',
        width: 900,
        height: 850,
        depth: 560,
        shelfCount: 0,
        doorCount: 2,
        doorStyle: 'flat',
        handleStyle: 'bar',
        kickHeight: 100,
        carcassMaterial: 'melamine-16',
        backPanelMaterial: 'mdf-3',
      }),
      cabinet('Right Base Cabinet', {
        furnitureType: 'cabinet',
        width: 600,
        height: 850,
        depth: 560,
        shelfCount: 1,
        doorCount: 2,
        doorStyle: 'flat',
        handleStyle: 'bar',
        kickHeight: 100,
        carcassMaterial: 'melamine-16',
        backPanelMaterial: 'mdf-3',
      }),
    ],
  },
  {
    id: 'wallCabinetRun',
    cabinets: [
      cabinet('Left Wall Cabinet', {
        furnitureType: 'cabinet',
        width: 600,
        height: 720,
        depth: 320,
        shelfCount: 2,
        doorCount: 2,
        doorStyle: 'flat',
        handleStyle: 'knob',
        kickHeight: 0,
        carcassMaterial: 'melamine-16',
        backPanelMaterial: 'mdf-3',
      }),
      cabinet('Center Wall Cabinet', {
        furnitureType: 'cabinet',
        width: 400,
        height: 720,
        depth: 320,
        shelfCount: 2,
        doorCount: 1,
        doorStyle: 'flat',
        handleStyle: 'knob',
        kickHeight: 0,
        carcassMaterial: 'melamine-16',
        backPanelMaterial: 'mdf-3',
      }),
      cabinet('Right Wall Cabinet', {
        furnitureType: 'cabinet',
        width: 600,
        height: 720,
        depth: 320,
        shelfCount: 2,
        doorCount: 2,
        doorStyle: 'flat',
        handleStyle: 'knob',
        kickHeight: 0,
        carcassMaterial: 'melamine-16',
        backPanelMaterial: 'mdf-3',
      }),
    ],
  },
  {
    id: 'bookcase',
    cabinets: [
      cabinet('Bookcase', {
        ...BOOKSHELF_DEFAULTS,
        width: 800,
        height: 2000,
        depth: 300,
        shelfCount: 5,
        carcassMaterial: 'plywood-18',
        backPanelMaterial: 'mdf-3',
      }),
    ],
  },
  {
    id: 'wardrobe',
    cabinets: [
      cabinet('Wardrobe', {
        ...WARDROBE_DEFAULTS,
        width: 1200,
        height: 2200,
        depth: 600,
        shelfCount: 3,
        carcassMaterial: 'melamine-18',
        backPanelMaterial: 'mdf-3',
        edgeBanding: 'doors-only',
      }),
    ],
  },
  {
    id: 'bathroomVanity',
    cabinets: [
      cabinet('Bathroom Vanity', {
        furnitureType: 'cabinet',
        width: 800,
        height: 820,
        depth: 450,
        shelfCount: 0,
        doorStyle: 'none',
        doorCount: 1,
        drawerCount: 2,
        drawerHeights: [160, 200],
        drawerSlideType: 'soft-close',
        handleStyle: 'knob',
        kickHeight: 80,
        carcassMaterial: 'melamine-16',
        backPanelMaterial: 'mdf-3',
      }),
    ],
  },
  {
    id: 'workshopStorage',
    cabinets: [
      cabinet('Shop Shelving Unit 1', {
        furnitureType: 'cabinet',
        width: 900,
        height: 2000,
        depth: 500,
        shelfCount: 5,
        doorStyle: 'none',
        doorCount: 1,
        handleStyle: 'none',
        kickHeight: 100,
        carcassMaterial: 'plywood-18',
        backPanelMaterial: 'mdf-3',
        edgeBanding: 'none',
      }),
      cabinet('Shop Shelving Unit 2', {
        furnitureType: 'cabinet',
        width: 900,
        height: 2000,
        depth: 500,
        shelfCount: 5,
        doorStyle: 'none',
        doorCount: 1,
        handleStyle: 'none',
        kickHeight: 100,
        carcassMaterial: 'plywood-18',
        backPanelMaterial: 'mdf-3',
        edgeBanding: 'none',
      }),
    ],
  },
] as const;
