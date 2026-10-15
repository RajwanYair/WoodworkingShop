import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { pdf } from '@react-pdf/renderer';
import { useCabinetStore } from '../../store/cabinet-store';
import { CabinetPdfDocument } from './CabinetPdfDocument';
import type { CabinetPdfEntry } from './pdf-entry';
import { exportSettingsJson, importSettingsJson } from '../../utils/project-storage';
import type { ProjectSettings } from '../../utils/project-storage';
import { useToastStore } from '../../store/toast-store';
import { resolvePdfLang } from './pdf-i18n';
import { generateParts, computeEdgeBandingTotal } from '../../engine/geometry/parts';
import { generateHardware } from '../../engine/hardware/hardware';
import { computeDimensions } from '../../engine/geometry/dimensions';
import { generateBomCsv } from '../../utils/bom-export';
import { cutSheetToDxf } from '../../utils/dxf-export';
import { generateGltfContent } from '../../engine/export/gltf-document';
import { buildZip, createZipManifest, downloadZip } from '../../utils/zip-writer';
import { utf8Encode } from '../../utils/browser-compat';
import { downloadBlob } from '../../store/platform-boundary';
import { PdfExportDownloads } from './PdfExportDownloads';

export function PdfExportPanel() {
  const { t, i18n } = useTranslation();
  const store = useCabinetStore();
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingZip, setGeneratingZip] = useState(false);
  const [includeCover, setIncludeCover] = useState(true); // v3.19.0
  const [pageSize, setPageSize] = useState<'A4' | 'LETTER'>('A4'); // Sprint 59
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait'); // Sprint 59
  const settingsFileRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(false);
  const activeExportRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleGenerate = async () => {
    if (activeExportRef.current) return;
    activeExportRef.current = true;
    setGenerating(true);
    try {
      const lang = resolvePdfLang(i18n.resolvedLanguage ?? i18n.language);
      const doc = (
        <CabinetPdfDocument
          config={store.config}
          dimensions={store.dimensions}
          parts={store.parts}
          hardware={store.hardware}
          optimization={store.optimization}
          edgeBandingTotal={store.edgeBandingTotal}
          lang={lang}
          projectName={store.projectName}
          includeCover={includeCover}
          cabinetCount={store.cabinets.length}
          pageSize={pageSize}
          orientation={orientation}
          labourHours={store.labourHours}
        />
      );
      const blob = await pdf(doc).toBlob();
      if (!isMountedRef.current) return;
      const safeName =
        (store.projectName.trim() || 'cabinet-plan')
          .replace(/[^\w\u05D0-\u05EA.-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'cabinet-plan';
      downloadBlob(blob, `${safeName}-${store.config.width}x${store.config.height}x${store.config.depth}.pdf`);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('[PdfExportPanel] PDF generation failed:', err);
      useToastStore.getState().addToast(t('pdf.error'), 'error');
    } finally {
      activeExportRef.current = false;
      if (isMountedRef.current) setGenerating(false);
    }
  };

  /** v3.58.0 — Export full project: all cabinets share cut sheets by material. */
  const handleGenerateAll = async () => {
    if (activeExportRef.current) return;
    activeExportRef.current = true;
    setGeneratingAll(true);
    try {
      const lang = resolvePdfLang(i18n.resolvedLanguage ?? i18n.language);

      // Build per-cabinet data from the store's cabinet list.
      const allCabinetsData: CabinetPdfEntry[] = store.cabinets.map((cab, ci) => {
        const cabParts = generateParts(cab.config).map((p) => ({
          ...p,
          id: store.cabinets.length > 1 ? `C${ci + 1}-${p.id}` : p.id,
        }));
        return {
          name: cab.name,
          config: cab.config,
          dimensions: computeDimensions(cab.config),
          parts: cabParts,
          hardware: generateHardware(cab.config),
          edgeBandingTotal: computeEdgeBandingTotal(cabParts),
        };
      });

      // Merge hardware across all cabinets, summing quantities for matching IDs.
      const hwMap = new Map<string, (typeof allCabinetsData)[0]['hardware'][0]>();
      for (const cab of allCabinetsData) {
        for (const hw of cab.hardware) {
          const existing = hwMap.get(hw.id);
          if (existing) {
            hwMap.set(hw.id, { ...existing, qty: existing.qty + hw.qty });
          } else {
            hwMap.set(hw.id, { ...hw });
          }
        }
      }
      const allHardware = Array.from(hwMap.values());

      const totalPartsCount = allCabinetsData.reduce((sum, c) => sum + c.parts.length, 0);
      const doc = (
        <CabinetPdfDocument
          config={store.config}
          dimensions={store.dimensions}
          parts={store.parts}
          hardware={store.hardware}
          optimization={store.optimization}
          edgeBandingTotal={store.edgeBandingTotal}
          lang={lang}
          projectName={store.projectName}
          includeCover={includeCover}
          cabinetCount={store.cabinets.length}
          pageSize={pageSize}
          orientation={orientation}
          allCabinetsData={allCabinetsData}
          combinedOptimization={store.combinedOptimization}
          allHardware={allHardware}
          labourHours={store.labourHours}
        />
      );
      const blob = await pdf(doc).toBlob();
      if (!isMountedRef.current) return;
      const safeName =
        (store.projectName.trim() || 'cabinet-project')
          .replace(/[^\w\u05D0-\u05EA.-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'cabinet-project';
      downloadBlob(blob, `${safeName}-${store.cabinets.length}-cabinets-${totalPartsCount}-parts.pdf`);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('[PdfExportPanel] Project PDF generation failed:', err);
      useToastStore.getState().addToast(t('pdf.error'), 'error');
    } finally {
      activeExportRef.current = false;
      if (isMountedRef.current) setGeneratingAll(false);
    }
  };

  /** Export project settings (saw kerf, sheet sizes, prices, costs) as a JSON file. */
  const handleExportSettings = () => {
    const settings: ProjectSettings = {
      sawKerf: store.sawKerf,
      materialPriceOverrides: store.materialPriceOverrides,
      edgeBandingRate: store.edgeBandingRate,
      hardwarePriceOverrides: store.hardwarePriceOverrides,
      hardwareQtyOverrides: store.hardwareQtyOverrides,
      sheetSizeOverrides: store.sheetSizeOverrides,
      labourRate: store.labourRate,
      labourHours: store.labourHours,
      finishCost: store.finishCost,
    };
    exportSettingsJson(settings, store.projectName || 'project');
    useToastStore.getState().addToast(t('pdf.settingsExported'), 'success');
  };

  /** Import project settings from a `.cabinet-settings.json` file and apply to the store. */
  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    void (async () => {
      try {
        const text = await file.text();
        const raw = JSON.parse(text) as unknown;
        const settings = importSettingsJson(raw);
        store.loadSettings(settings);
        useToastStore.getState().addToast(t('pdf.settingsImported'), 'success');
      } catch {
        useToastStore.getState().addToast(t('pdf.settingsImportError'), 'error');
      }
    })();
  };

  /** Sprint 86 — Export a ZIP bundle: PDF + DXF sheets + BOM CSV + glTF. */
  const handleExportZip = () => {
    if (activeExportRef.current) return;
    activeExportRef.current = true;
    setGeneratingZip(true);
    const lang = resolvePdfLang(i18n.resolvedLanguage ?? i18n.language);
    const safeName =
      (store.projectName.trim() || 'cabinet-plan')
        .replace(/[^\w\u05D0-\u05EA.-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'cabinet-plan';

    void (async () => {
      try {
        const entries: import('../../utils/zip-writer').ZipEntry[] = [];

        // 1) PDF
        const doc = (
          <CabinetPdfDocument
            config={store.config}
            dimensions={store.dimensions}
            parts={store.parts}
            hardware={store.hardware}
            optimization={store.optimization}
            edgeBandingTotal={store.edgeBandingTotal}
            lang={lang}
            projectName={store.projectName}
            includeCover={includeCover}
            cabinetCount={store.cabinets.length}
            pageSize={pageSize}
            orientation={orientation}
            labourHours={store.labourHours}
          />
        );
        const pdfBlob = await pdf(doc).toBlob();
        if (!isMountedRef.current) return;
        const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
        if (!isMountedRef.current) return;
        entries.push({ name: `${safeName}.pdf`, data: pdfBytes });

        // 2) DXF — one file per cut sheet
        for (let i = 0; i < store.optimization.sheets.length; i++) {
          const sheet = store.optimization.sheets[i]!;
          const dxfText = cutSheetToDxf(sheet);
          entries.push({ name: `sheets/sheet-${i + 1}-${sheet.material}.dxf`, data: utf8Encode(dxfText) });
        }

        // 3) BOM CSV
        const bomCsv = generateBomCsv(
          store.cabinets.map((c) => ({
            name: c.name,
            parts: generateParts(c.config),
            hardware: generateHardware(c.config),
          })),
          lang,
        );
        entries.push({ name: `${safeName}-bom.csv`, data: utf8Encode(bomCsv) });

        // 4) glTF
        const { content: gltfJson } = generateGltfContent(store.config, store.parts);
        entries.push({ name: `${safeName}.gltf`, data: utf8Encode(gltfJson) });

        // 5) README
        const readme = [
          `WoodworkingShop — Export Bundle`,
          `Project: ${store.projectName || safeName}`,
          `Generated: ${new Date().toISOString()}`,
          ``,
          `Contents:`,
          `  ${safeName}.pdf         — Build plan (PDF)`,
          `  sheets/sheet-N-*.dxf   — Cut-sheet layouts (DXF, one per sheet)`,
          `  ${safeName}-bom.csv     — Bill of materials (CSV)`,
          `  ${safeName}.gltf        — 3-D model for AR/VR (glTF 2.0)`,
          `  manifest.json          — SHA-256 integrity manifest`,
        ].join('\n');
        entries.push({ name: 'README.txt', data: utf8Encode(readme) });

        entries.push(await createZipManifest(entries));
        if (!isMountedRef.current) return;
        const zipBytes = buildZip(entries);
        downloadZip(zipBytes, `${safeName}-bundle.zip`);
        useToastStore.getState().addToast(t('pdf.zipExported'), 'success');
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('[PdfExportPanel] ZIP export failed:', err);
        useToastStore.getState().addToast(t('pdf.error'), 'error');
      } finally {
        activeExportRef.current = false;
        if (isMountedRef.current) setGeneratingZip(false);
      }
    })();
  };

  return (
    <PdfExportDownloads
      includeCover={includeCover}
      setIncludeCover={setIncludeCover}
      pageSize={pageSize}
      setPageSize={setPageSize}
      orientation={orientation}
      setOrientation={setOrientation}
      generating={generating}
      generatingAll={generatingAll}
      generatingZip={generatingZip}
      handleGenerate={() => void handleGenerate()}
      handleGenerateAll={() => void handleGenerateAll()}
      handleExportZip={handleExportZip}
      handleExportSettings={handleExportSettings}
      handleImportSettings={handleImportSettings}
      settingsFileRef={settingsFileRef}
    />
  );
}
