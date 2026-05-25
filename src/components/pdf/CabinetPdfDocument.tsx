import { Document } from '@react-pdf/renderer';
import type {
  CabinetConfig,
  DerivedDimensions,
  Part,
  HardwareItem,
  OptimizationResult,
  Lang,
} from '../../engine/types';
import { getMaterial } from '../../engine/materials';
import { pdfI18n } from './pdf-i18n';
import type { PdfLang, PdfCtx } from './pdf-i18n';
// Side-effect import: registers fonts + emoji source before any render
import './pdf-tokens';
import { PdfCoverPage } from './sections/PdfCoverPage';
import { PdfSpecPage } from './sections/PdfSpecPage';
import { PdfPartsPage } from './sections/PdfPartsPage';
import { PdfHardwarePage } from './sections/PdfHardwarePage';
import { PdfMultiCabSection, PdfMultiCabHardwarePage } from './sections/PdfMultiCabSection';
import { PdfCutSheetPage } from './sections/PdfCutSheetPage';
import { PdfDrillingPage } from './sections/PdfDrillingPage';
import { PdfExplodedPage, PdfAssemblyPage } from './sections/PdfAssemblyPage';
import { PdfShoppingPage } from './sections/PdfShoppingPage';

/** One cabinet's computed data, passed to the project-PDF export. */
export interface CabinetPdfEntry {
  name: string;
  config: CabinetConfig;
  dimensions: DerivedDimensions;
  parts: Part[];
  hardware: HardwareItem[];
  edgeBandingTotal: number;
}

export interface CabinetPdfProps {
  config: CabinetConfig;
  dimensions: DerivedDimensions;
  parts: Part[];
  hardware: HardwareItem[];
  optimization: OptimizationResult;
  edgeBandingTotal: number;
  lang: Lang;
  /** v3.19.0 — project name shown on cover page title */
  projectName?: string;
  /** v3.19.0 — whether to render the cover page (default: true) */
  includeCover?: boolean;
  /** v3.39.0 — total number of cabinets in the project (shown on cover) */
  cabinetCount?: number;
  /** Sprint 59 — page size for all PDF pages (default: 'A4') */
  pageSize?: 'A4' | 'LETTER';
  /** Sprint 59 — page orientation for non-cut-sheet pages (default: 'portrait') */
  orientation?: 'portrait' | 'landscape';
  /**
   * v3.58.0 — Full project export: when provided, the PDF renders one
   * specs + parts section per cabinet and uses `combinedOptimization`
   * for the shared cut plan (parts from all cabinets placed on shared sheets).
   */
  allCabinetsData?: CabinetPdfEntry[];
  /** Shared cut optimisation across all cabinets (used when allCabinetsData is set). */
  combinedOptimization?: OptimizationResult;
  /** Merged hardware list across all cabinets (used when allCabinetsData is set). */
  allHardware?: HardwareItem[];
}

export function CabinetPdfDocument({
  config,
  dimensions: d,
  parts,
  hardware,
  optimization,
  edgeBandingTotal,
  lang,
  projectName,
  includeCover = true,
  cabinetCount = 1,
  pageSize = 'A4',
  orientation = 'portrait',
  allCabinetsData,
  combinedOptimization,
  allHardware,
}: CabinetPdfProps) {
  const T = pdfI18n[lang as PdfLang] ?? pdfI18n.en;
  const isRTL = lang === 'he';
  const fontFamily = isRTL ? 'NotoSansHebrew' : 'Helvetica';
  const fontFamilyBold = isRTL ? 'NotoSansHebrew' : 'Helvetica-Bold';
  const textAlign = isRTL ? ('right' as const) : ('left' as const);

  const isMultiCabinet = Array.isArray(allCabinetsData) && allCabinetsData.length > 0;
  const effectiveOptimization = isMultiCabinet ? (combinedOptimization ?? optimization) : optimization;
  const effectiveHardware = isMultiCabinet ? (allHardware ?? hardware) : hardware;

  const cMat = getMaterial(config.carcassMaterial);
  const bMat = getMaterial(config.backPanelMaterial);
  const dateLocale = isRTL ? 'he-IL' : 'en-GB';
  const date = new Date().toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' });
  const coverTitle = projectName?.trim() ? projectName.trim() : T.coverTitle;
  const docTitle = `${coverTitle} — ${config.width}×${config.height}×${config.depth}`;

  const ctx: PdfCtx = {
    T,
    fontFamily,
    fontFamilyBold,
    textAlign,
    isRTL,
    lang,
    date,
    coverTitle,
    pageSize,
    orientation,
  };

  return (
    <Document title={docTitle} author="Cabinet Planner" subject="Woodworking Build Plan">
      {includeCover && (
        <PdfCoverPage
          ctx={ctx}
          config={config}
          cMatName={cMat.name[lang]}
          cMatThickness={cMat.thickness}
          optimization={optimization}
          hardware={hardware}
          cabinetCount={cabinetCount}
        />
      )}

      {!isMultiCabinet && (
        <>
          <PdfSpecPage
            ctx={ctx}
            config={config}
            d={d}
            parts={parts}
            hardware={hardware}
            optimization={optimization}
            edgeBandingTotal={edgeBandingTotal}
            cMatName={cMat.name[lang]}
            cMatThickness={cMat.thickness}
            bMatName={bMat.name[lang]}
            bMatThickness={bMat.thickness}
          />
          <PdfPartsPage ctx={ctx} parts={parts} />
          <PdfHardwarePage ctx={ctx} hardware={hardware} />
        </>
      )}

      {isMultiCabinet && <PdfMultiCabSection ctx={ctx} allCabinetsData={allCabinetsData!} />}
      {isMultiCabinet && <PdfMultiCabHardwarePage ctx={ctx} hardware={effectiveHardware} />}

      {effectiveOptimization.sheets.map((sheet) => (
        <PdfCutSheetPage
          key={sheet.sheetIndex}
          ctx={ctx}
          sheet={sheet}
          totalSheets={effectiveOptimization.sheets.length}
          isMultiCabinet={isMultiCabinet}
        />
      ))}

      <PdfDrillingPage ctx={ctx} d={d} backPanelMaterial={config.backPanelMaterial} />
      <PdfExplodedPage ctx={ctx} config={config} d={d} cMatName={cMat.name[lang]} bMatName={bMat.name[lang]} />
      <PdfAssemblyPage ctx={ctx} config={config} d={d} cMatName={cMat.name[lang]} bMatName={bMat.name[lang]} />
      <PdfShoppingPage ctx={ctx} optimization={optimization} hardware={hardware} edgeBandingTotal={edgeBandingTotal} />
    </Document>
  );
}
