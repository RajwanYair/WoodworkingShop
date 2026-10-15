import type { CutSheet, DefectZone, Lang } from '../../engine/core/types';
import type { StringTranslator } from '../../i18n/translate';

export interface SheetCardProps {
  sheet: CutSheet;
  lang: Lang;
  hoveredPartId: string | null;
  onHoverPart: (id: string | null) => void;
  colorBlindMode: boolean;
  showPartNames: boolean;
  showGrainHatch: boolean;
  /** Phase 12 / Sprint 13 — defect zones to render as red blocked areas on this sheet. */
  defectZones?: DefectZone[];
  filePrefix: string;
  partFilter: string;
  preloadGcodePreview?: () => void;
  onGcodePreview: (filename: string, sheet: CutSheet) => void;
  rotationLockedPartIds: Record<string, boolean>;
  onToggleRotationLock: (partId: string) => void;
  t: StringTranslator;
}
