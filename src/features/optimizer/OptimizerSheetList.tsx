import type { CutSheet, DefectZone, Lang } from '../../engine/core/types';
import type { StringTranslator } from '../../i18n/translate';
import { SheetCard } from './SheetCard';
import { VirtualSheetWrapper } from './VirtualSheetWrapper';

interface OptimizerSheetListProps {
  sheets: readonly CutSheet[];
  totalSheets: number;
  overallYield: number;
  lang: Lang;
  hoveredPartId: string | null;
  setHoveredPartId: (id: string | null) => void;
  colorBlindMode: boolean;
  showPartNames: boolean;
  showGrainHatch: boolean;
  defectZones: Record<string, DefectZone[]>;
  filePrefix: string;
  partFilter: string;
  preloadGcodePreview: () => void;
  onGcodePreview: (filename: string, sheet: CutSheet) => void;
  rotationLockedPartIds: Record<string, boolean>;
  toggleRotationLock: (partId: string) => void;
  t: StringTranslator;
}

export function OptimizerSheetList({
  sheets,
  totalSheets,
  overallYield,
  lang,
  hoveredPartId,
  setHoveredPartId,
  colorBlindMode,
  showPartNames,
  showGrainHatch,
  defectZones,
  filePrefix,
  partFilter,
  preloadGcodePreview,
  onGcodePreview,
  rotationLockedPartIds,
  toggleRotationLock,
  t,
}: Readonly<OptimizerSheetListProps>) {
  const displayOpt = { sheets, totalSheets, overallYield };
  const preloadGcodePreviewModal = preloadGcodePreview;
  const setGcodePreview = (value: { filename: string; sheet: CutSheet }) => onGcodePreview(value.filename, value.sheet);
  return (
    <>
      {/* Individual sheets — data-print-sheets targets print CSS (Sprint 151) */}
      {/* v3.28.0: wide sheets (>1500mm) get landscape page layout in print */}
      <div
        data-print-sheets
        className={
          displayOpt.sheets.some((s) => s.sheetWidth > 1500 || s.sheetLength > 1500) ? 'print-landscape' : undefined
        }
      >
        {displayOpt.sheets.map((sheet) => (
          <VirtualSheetWrapper key={sheet.sheetIndex}>
            <SheetCard
              sheet={sheet}
              lang={lang}
              hoveredPartId={hoveredPartId}
              onHoverPart={setHoveredPartId}
              colorBlindMode={colorBlindMode}
              showPartNames={showPartNames}
              showGrainHatch={showGrainHatch}
              defectZones={defectZones[sheet.material] ?? []}
              filePrefix={filePrefix}
              partFilter={partFilter}
              preloadGcodePreview={preloadGcodePreviewModal}
              onGcodePreview={(filename, s) => setGcodePreview({ filename, sheet: s })}
              rotationLockedPartIds={rotationLockedPartIds}
              onToggleRotationLock={toggleRotationLock}
              t={t}
            />
          </VirtualSheetWrapper>
        ))}
        {/* v3.28.0 — print-only footer with stats */}
        <div className="print-only-footer hidden">
          {filePrefix} — {displayOpt.totalSheets} {t('optimizer.sheets').toLowerCase()}, {displayOpt.overallYield}%{' '}
          {t('optimizer.yield').toLowerCase()}
        </div>
      </div>
    </>
  );
}
