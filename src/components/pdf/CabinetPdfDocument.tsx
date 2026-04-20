import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type {
  CabinetConfig,
  DerivedDimensions,
  Part,
  HardwareItem,
  OptimizationResult,
  Lang,
} from '../../engine/types';
import { getMaterial } from '../../engine/materials';

// ─── Shared styles ───

const colors = {
  primary: '#6B4226',
  secondary: '#8B6914',
  bg: '#FDF8F0',
  text: '#333333',
  muted: '#888888',
  border: '#D4C4A0',
  headerBg: '#F5F0E8',
  white: '#FFFFFF',
};

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: colors.text, backgroundColor: colors.white },
  // Cover
  coverPage: { padding: 40, fontFamily: 'Helvetica', backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  coverTitle: { fontSize: 32, fontFamily: 'Helvetica-Bold', color: colors.primary, marginBottom: 8 },
  coverSubtitle: { fontSize: 14, color: colors.secondary, marginBottom: 40 },
  coverMeta: { fontSize: 10, color: colors.muted, marginTop: 4 },
  // Section
  sectionTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: colors.primary, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4 },
  // Specs
  specRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingVertical: 3 },
  specLabel: { width: '40%', fontFamily: 'Helvetica-Bold', fontSize: 9, color: colors.muted },
  specValue: { width: '60%', fontSize: 10 },
  specGroup: { marginBottom: 16 },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: colors.headerBg, paddingVertical: 4, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 2, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  tableRowAlt: { backgroundColor: '#FAFAF5' },
  thText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: colors.primary },
  tdText: { fontSize: 8 },
  // Footer
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: colors.muted },
  // Summary stat
  statRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  statBox: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 8, alignItems: 'center' },
  statValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: colors.primary },
  statLabel: { fontSize: 7, color: colors.muted, marginTop: 2 },
  // Guide
  guideSubtitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: colors.secondary, marginBottom: 4, marginTop: 4 },
  guideText: { fontSize: 9, color: colors.text, marginBottom: 2, paddingLeft: 4 },
  guideIndent: { fontSize: 9, color: colors.text, marginBottom: 1, paddingLeft: 20 },
  // Assembly
  assemblyStep: { flexDirection: 'row', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  stepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, color: colors.white, fontSize: 12, fontFamily: 'Helvetica-Bold', textAlign: 'center', lineHeight: 24, marginRight: 10 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 2 },
  stepDesc: { fontSize: 9, color: colors.muted },
});

// ─── Column width definitions ───

const partsColWidths = ['8%', '22%', '6%', '18%', '12%', '12%', '8%', '14%'];
const hwColWidths = ['30%', '30%', '20%', '20%'];

// ─── Props ───

export interface CabinetPdfProps {
  config: CabinetConfig;
  dimensions: DerivedDimensions;
  parts: Part[];
  hardware: HardwareItem[];
  optimization: OptimizationResult;
  edgeBandingTotal: number;
  lang: Lang;
}

export function CabinetPdfDocument({
  config,
  dimensions: d,
  parts,
  hardware,
  optimization,
  edgeBandingTotal,
  lang,
}: CabinetPdfProps) {
  const cMat = getMaterial(config.carcassMaterial);
  const bMat = getMaterial(config.backPanelMaterial);
  const date = new Date().toLocaleDateString('en-GB');

  return (
    <Document title={`Cabinet Plan — ${config.width}×${config.height}×${config.depth}`} author="Cabinet Planner">
      {/* ── Page 1: Cover ── */}
      <Page size="A4" style={s.coverPage}>
        <Text style={s.coverTitle}>Cabinet Build Plan</Text>
        <Text style={s.coverSubtitle}>
          {config.width} × {config.height} × {config.depth} mm
        </Text>
        <Text style={s.coverMeta}>{cMat.name[lang]} — {config.doorCount} door(s)</Text>
        <Text style={s.coverMeta}>Generated {date}</Text>
        <Text style={[s.coverMeta, { marginTop: 60, fontSize: 8 }]}>
          Cabinet Planner — Interactive Woodworking Design Tool
        </Text>
      </Page>

      {/* ── Page 2: Specifications ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Specifications</Text>

        <View style={s.specGroup}>
          <SpecRow label="External dimensions" value={`${config.width} × ${config.height} × ${config.depth} mm`} />
          <SpecRow label="Internal width" value={`${d.internalWidth} mm`} />
          <SpecRow label="Internal height" value={`${d.internalHeight} mm`} />
          <SpecRow label="Shelf depth" value={`${d.shelfDepth} mm`} />
          <SpecRow label="Shelf width" value={`${d.shelfWidth} mm`} />
        </View>

        <View style={s.specGroup}>
          <SpecRow label="Carcass material" value={`${cMat.name[lang]} (${cMat.thickness} mm)`} />
          <SpecRow label="Back panel material" value={`${bMat.name[lang]} (${bMat.thickness} mm)`} />
          <SpecRow label="Edge banding" value={config.edgeBanding} />
          <SpecRow label="Edge banding total" value={`${(edgeBandingTotal / 1000).toFixed(1)} m`} />
        </View>

        <View style={s.specGroup}>
          <SpecRow label="Door style" value={config.doorStyle} />
          <SpecRow label="Door count" value={String(config.doorCount)} />
          <SpecRow label="Door dimensions" value={`${Math.round(d.doorWidth)} × ${Math.round(d.doorHeight)} mm`} />
          <SpecRow label="Door reveal" value={`${config.doorReveal} mm`} />
          <SpecRow label="Hinges per door" value={String(d.hingesPerDoor)} />
          <SpecRow label="Handle style" value={config.handleStyle} />
        </View>

        <View style={s.specGroup}>
          <SpecRow label="Shelf count" value={String(config.shelfCount)} />
          <SpecRow label="Shelf spacing" value={config.shelfSpacing} />
          <SpecRow label="Back panel" value={`${Math.round(d.backPanelWidth)} × ${Math.round(d.backPanelHeight)} mm`} />
        </View>

        <Text style={[s.sectionTitle, { marginTop: 16 }]}>Cut Sheet Summary</Text>
        <View style={s.statRow}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{optimization.totalSheets}</Text>
            <Text style={s.statLabel}>Sheets Required</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{optimization.overallYield}%</Text>
            <Text style={s.statLabel}>Material Yield</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{(optimization.totalWaste / 1_000_000).toFixed(2)}</Text>
            <Text style={s.statLabel}>Waste (m²)</Text>
          </View>
        </View>

        <PageFooter />
      </Page>

      {/* ── Page 3: Parts Table ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Parts List</Text>

        {/* Header */}
        <View style={s.tableHeader}>
          {['ID', 'Part Name', 'Qty', 'Material', 'Length', 'Width', 'Thick.', 'Edge Band'].map((h, i) => (
            <Text key={i} style={[s.thText, { width: partsColWidths[i] }]}>{h}</Text>
          ))}
        </View>

        {/* Rows */}
        {parts.map((p, i) => (
          <View key={p.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tdText, { width: partsColWidths[0] }]}>{p.id}</Text>
            <Text style={[s.tdText, { width: partsColWidths[1] }]}>{p.name[lang]}</Text>
            <Text style={[s.tdText, { width: partsColWidths[2] }]}>{p.qty}</Text>
            <Text style={[s.tdText, { width: partsColWidths[3] }]}>{getMaterial(p.material).name[lang]}</Text>
            <Text style={[s.tdText, { width: partsColWidths[4] }]}>{p.length} mm</Text>
            <Text style={[s.tdText, { width: partsColWidths[5] }]}>{p.width} mm</Text>
            <Text style={[s.tdText, { width: partsColWidths[6] }]}>{p.thickness}</Text>
            <Text style={[s.tdText, { width: partsColWidths[7] }]}>{p.edgeBanding[lang]}</Text>
          </View>
        ))}

        <PageFooter />
      </Page>

      {/* ── Page 4: Hardware Table ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Hardware List</Text>

        <View style={s.tableHeader}>
          {['Item', 'Qty', 'Unit', ''].map((h, i) => (
            <Text key={i} style={[s.thText, { width: hwColWidths[i] }]}>{h}</Text>
          ))}
        </View>

        {hardware.map((hw, i) => (
          <View key={hw.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tdText, { width: hwColWidths[0] }]}>{hw.name[lang]}</Text>
            <Text style={[s.tdText, { width: hwColWidths[1] }]}>{hw.qty}</Text>
            <Text style={[s.tdText, { width: hwColWidths[2] }]}>{hw.unit[lang]}</Text>
            <Text style={[s.tdText, { width: hwColWidths[3] }]} />
          </View>
        ))}

        <PageFooter />
      </Page>

      {/* ── Pages 5+: Cut Sheet Diagrams ── */}
      {optimization.sheets.map((sheet) => {
        const mat = getMaterial(sheet.material);
        const scale = Math.min(500 / sheet.sheetLength, 420 / sheet.sheetWidth);

        return (
          <Page key={sheet.sheetIndex} size="A4" style={s.page}>
            <Text style={s.sectionTitle}>
              Sheet #{sheet.sheetIndex + 1} — {mat.name[lang]} ({sheet.thickness} mm) — {sheet.yieldPercent}% yield
            </Text>

            {/* Sheet SVG-like layout using View/Text */}
            <View style={{ width: sheet.sheetLength * scale, height: sheet.sheetWidth * scale, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F5F0E8', position: 'relative' }}>
              {sheet.parts.map((p, i) => (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: p.x * scale,
                    top: p.y * scale,
                    width: p.width * scale,
                    height: p.length * scale,
                    backgroundColor: mat.color,
                    borderWidth: 0.5,
                    borderColor: '#555',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: Math.min(7, p.width * scale * 0.12), color: '#333' }}>
                    {p.partId}
                  </Text>
                  <Text style={{ fontSize: Math.min(5, p.width * scale * 0.08), color: '#666' }}>
                    {p.width}×{p.length}
                  </Text>
                </View>
              ))}
            </View>

            {/* Legend */}
            <View style={{ marginTop: 12 }}>
              {sheet.parts.map((p, i) => (
                <Text key={i} style={{ fontSize: 7, color: colors.muted, marginBottom: 1 }}>
                  {p.partId}: {p.label} — {p.width} × {p.length} mm
                </Text>
              ))}
            </View>

            <PageFooter />
          </Page>
        );
      })}

      {/* ── Drilling & Boring Guide ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Drilling &amp; Boring Guide</Text>

        <View style={s.specGroup}>
          <Text style={s.guideSubtitle}>Hinge Cup Boring</Text>
          <Text style={s.guideText}>
            • Bore 35 mm diameter cups, 12 mm deep on door inside face
          </Text>
          <Text style={s.guideText}>
            • Hinge cup center: 22.5 mm from door edge
          </Text>
          <Text style={s.guideText}>
            • {d.hingesPerDoor} hinge(s) per door — positions from top:
          </Text>
          {d.hingePositions.map((pos, i) => (
            <Text key={i} style={s.guideIndent}>
              Hinge {i + 1}: {pos} mm from top
            </Text>
          ))}
        </View>

        <View style={s.specGroup}>
          <Text style={s.guideSubtitle}>Mounting Plates</Text>
          <Text style={s.guideText}>
            • Fix mounting plates on side panels, aligned with hinge positions
          </Text>
          <Text style={s.guideText}>
            • Plate center: 37 mm from panel front edge
          </Text>
          <Text style={s.guideText}>
            • Pre-drill 3 mm pilot holes for plate screws
          </Text>
        </View>

        <View style={s.specGroup}>
          <Text style={s.guideSubtitle}>Shelf Pin Holes</Text>
          <Text style={s.guideText}>
            • Drill 5 mm holes, 10 mm deep, on both side panels (inner face)
          </Text>
          <Text style={s.guideText}>
            • Two columns per side: 37 mm and {d.internalWidth > 400 ? d.shelfDepth - 37 : Math.round(d.shelfDepth / 2)} mm from front edge
          </Text>
          <Text style={s.guideText}>
            • Spacing: 32 mm on-center (system 32 line boring)
          </Text>
          <Text style={s.guideText}>
            • First hole: 37 mm from bottom of internal space
          </Text>
          <Text style={s.guideText}>
            • Total rows: {Math.max(1, Math.floor((d.internalHeight - 74) / 32) + 1)} per column
          </Text>
        </View>

        <View style={s.specGroup}>
          <Text style={s.guideSubtitle}>Confirmat / Assembly Screws</Text>
          <Text style={s.guideText}>
            • Pre-drill 5 mm through-holes on outer face of top/bottom panels
          </Text>
          <Text style={s.guideText}>
            • Pilot drill 3.5 mm × 40 mm into end-grain of side panels
          </Text>
          <Text style={s.guideText}>
            • Spacing: ~150 mm apart along each joint
          </Text>
          <Text style={s.guideText}>
            • First/last confirmat: ~50 mm from panel edge
          </Text>
        </View>

        <View style={s.specGroup}>
          <Text style={s.guideSubtitle}>Back Panel</Text>
          <Text style={s.guideText}>
            • {bMat.name[lang]} ({bMat.thickness} mm) — {Math.round(d.backPanelWidth)} × {Math.round(d.backPanelHeight)} mm
          </Text>
          <Text style={s.guideText}>
            • Fix into 10 × {bMat.thickness} mm rabbet, or staple/nail at ~150 mm intervals
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* ── Assembly Sequence ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Assembly Sequence</Text>

        {assemblySteps(config, d, cMat.name[lang], bMat.name[lang]).map((step, i) => (
          <View key={i} style={s.assemblyStep} wrap={false}>
            <Text style={s.stepNumber}>{i + 1}</Text>
            <View style={s.stepContent}>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={s.stepDesc}>{step.description}</Text>
            </View>
          </View>
        ))}

        <PageFooter />
      </Page>

      {/* ── Shopping List ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Shopping List</Text>

        <Text style={s.guideSubtitle}>Sheet Goods</Text>
        <View style={s.tableHeader}>
          {['Material', 'Size', 'Qty'].map((h, i) => (
            <Text key={i} style={[s.thText, { width: ['50%', '30%', '20%'][i] }]}>{h}</Text>
          ))}
        </View>
        {sheetSummary(optimization, lang).map((row, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tdText, { width: '50%' }]}>{row.material}</Text>
            <Text style={[s.tdText, { width: '30%' }]}>{row.size}</Text>
            <Text style={[s.tdText, { width: '20%' }]}>{row.qty}</Text>
          </View>
        ))}

        <Text style={[s.guideSubtitle, { marginTop: 16 }]}>Hardware</Text>
        <View style={s.tableHeader}>
          {['Item', 'Qty', 'Unit'].map((h, i) => (
            <Text key={i} style={[s.thText, { width: ['50%', '25%', '25%'][i] }]}>{h}</Text>
          ))}
        </View>
        {hardware.map((hw, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tdText, { width: '50%' }]}>{hw.name[lang]}</Text>
            <Text style={[s.tdText, { width: '25%' }]}>{hw.qty}</Text>
            <Text style={[s.tdText, { width: '25%' }]}>{hw.unit[lang]}</Text>
          </View>
        ))}

        {edgeBandingTotal > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={s.guideSubtitle}>Edge Banding</Text>
            <Text style={s.guideText}>
              Total edge banding required: {(edgeBandingTotal / 1000).toFixed(1)} meters
            </Text>
          </View>
        )}

        <PageFooter />
      </Page>
    </Document>
  );
}

// ─── Helpers ───

interface AssemblyStep { title: string; description: string }

function assemblySteps(
  config: CabinetConfig, d: DerivedDimensions, carcassName: string, backName: string,
): AssemblyStep[] {
  const steps: AssemblyStep[] = [
    {
      title: 'Prepare all panels',
      description: `Cut all parts per the cut list. Sand faces to 180 grit. Apply edge banding (${config.edgeBanding}) to designated edges.`,
    },
    {
      title: 'Drill shelf pin holes',
      description: `Drill 5 mm × 10 mm holes on both side panels (inner face), 32 mm apart, two columns per side. Use a jig for consistency.`,
    },
    {
      title: 'Pre-drill confirmat holes',
      description: `Drill 5 mm through-holes on top and bottom panels. Drill 3.5 mm × 40 mm pilot holes into side panel end-grain. Mark positions ~50 mm from edges, ~150 mm apart.`,
    },
    {
      title: 'Assemble the carcass box',
      description: `Join side panels to top and bottom with confirmat screws. Use ${carcassName} panels. Internal width: ${d.internalWidth} mm. Verify square with diagonal measurements.`,
    },
  ];

  if (config.height > 1200) {
    steps.push({
      title: 'Install fixed shelf',
      description: `Install the fixed structural shelf at mid-height. This shelf is required for cabinets taller than 1200 mm for rigidity. Secure with confirmats.`,
    });
  }

  steps.push(
    {
      title: 'Attach back panel',
      description: `Fit the ${backName} back panel (${Math.round(d.backPanelWidth)} × ${Math.round(d.backPanelHeight)} mm) into the rabbet or staple at ~150 mm intervals. Ensure cabinet remains square.`,
    },
    {
      title: 'Bore hinge cups on doors',
      description: `Bore 35 mm cups, 12 mm deep, center 22.5 mm from door edge. ${d.hingesPerDoor} hinges per door at positions: ${d.hingePositions.join(', ')} mm from top.`,
    },
    {
      title: 'Mount hinge plates on carcass',
      description: `Screw mounting plates on side panels aligned with hinge positions. Plate center: 37 mm from front edge. Pre-drill pilot holes.`,
    },
    {
      title: 'Hang doors and adjust',
      description: `Clip hinges into mounting plates. Adjust 3-way (in/out, up/down, lateral) until doors are flush with ${config.doorReveal} mm reveal all around.`,
    },
    {
      title: 'Install shelf pins and shelves',
      description: `Insert shelf pins at desired heights. Place ${config.shelfCount} adjustable shelf/shelves (${d.shelfWidth} × ${d.shelfDepth} mm).`,
    },
  );

  if (config.handleStyle !== 'none') {
    steps.push({
      title: 'Install handles',
      description: `Mount ${config.handleStyle} handles on door(s). For bar handles, use 128 mm or 160 mm center-to-center. Pre-drill before fastening.`,
    });
  }

  steps.push({
    title: 'Final checks',
    description: `Verify all doors open/close smoothly. Check shelf levels. Tighten any loose confirmats. Clean sawdust.`,
  });

  return steps;
}

interface SheetRow { material: string; size: string; qty: number }

function sheetSummary(optimization: OptimizationResult, lang: Lang): SheetRow[] {
  const map = new Map<string, SheetRow>();
  for (const sheet of optimization.sheets) {
    const mat = getMaterial(sheet.material);
    const key = `${sheet.material}-${sheet.thickness}`;
    const existing = map.get(key);
    if (existing) {
      existing.qty++;
    } else {
      map.set(key, {
        material: `${mat.name[lang]} (${sheet.thickness} mm)`,
        size: `${mat.sheetWidth} × ${mat.sheetLength} mm`,
        qty: 1,
      });
    }
  }
  return Array.from(map.values());
}

// ─── Sub-components ───

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.specRow}>
      <Text style={s.specLabel}>{label}</Text>
      <Text style={s.specValue}>{value}</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <Text>Cabinet Planner</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    </View>
  );
}
