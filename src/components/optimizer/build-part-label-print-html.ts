import type { LabeledPart } from '../../engine/part-labeling';
import { encodeLabelQr } from '../../engine/qr-code';

export interface PartLabelPrintOptions {
  pageSize?: 'A4' | 'Letter';
  rows?: number;
  columns?: number;
  labels?: {
    grain: string;
    alongLength: string;
    alongWidth: string;
    unspecified: string;
    edgeBanding: string;
    quantity: string;
    qrReference: string;
  };
}

const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => htmlEscapes[character] ?? character);
}

const DEFAULT_LABELS = {
  grain: 'Grain',
  alongLength: 'along length',
  alongWidth: 'along width',
  unspecified: 'not specified',
  edgeBanding: 'Edge banding',
  quantity: 'Quantity',
  qrReference: 'QR reference',
};

function boundedInteger(value: number | undefined, fallback: number, maximum: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(maximum, Math.floor(value ?? fallback))) : fallback;
}

function buildQrSvg(payload: string, accessibleLabel: string): string {
  if (!/^[A-Z]-\d{3}[a-z]?$/.test(payload)) return '';
  const matrix = encodeLabelQr(payload);
  const path = matrix
    .flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x + 4} ${y + 4}h1v1h-1z`] : [])))
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="qr" data-qr-reference="true" width="290" height="290" viewBox="0 0 29 29" role="img" aria-label="${escapeHtml(accessibleLabel)}" shape-rendering="crispEdges">` +
    `<title>${escapeHtml(accessibleLabel)}</title><rect width="29" height="29" fill="#fff"/>` +
    `<path d="${path}" fill="#000"/></svg>`
  );
}

function grainLabel(part: LabeledPart, labels: typeof DEFAULT_LABELS): string {
  if (part.grainConstraint === 'along-length') return labels.alongLength;
  if (part.grainConstraint === 'along-width') return labels.alongWidth;
  return labels.unspecified;
}

function renderLabel(part: LabeledPart, labels: typeof DEFAULT_LABELS): string {
  const grain = grainLabel(part, labels);
  const qrAccessibleLabel = `${labels.qrReference} ${part.partLabel}`;
  const qr = buildQrSvg(part.partLabel, qrAccessibleLabel);
  return (
    `<article class="label"><strong>${escapeHtml(part.partLabel)}</strong>` +
    `${qr}<span>${escapeHtml(part.name.en)}</span><span>${part.length} × ${part.width} × ${part.thickness} mm</span>` +
    `<span>${escapeHtml(part.material)}</span><span>${escapeHtml(labels.grain)}: ${escapeHtml(grain)}</span>` +
    `<span>${escapeHtml(labels.edgeBanding)}: ${escapeHtml(part.edgeBanding.en)}</span>` +
    `<span>${escapeHtml(labels.quantity)}: ${part.qty}</span></article>`
  );
}

export function buildPartLabelPrintHtml(
  labeledParts: readonly LabeledPart[],
  title: string,
  options: PartLabelPrintOptions = {},
): string {
  const pageSize = options.pageSize === 'Letter' ? 'Letter' : 'A4';
  const rows = boundedInteger(options.rows, 4, 8);
  const columns = boundedInteger(options.columns, 2, 4);
  const pageCapacity = rows * columns;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const pages: string[] = [];

  for (let start = 0; start < labeledParts.length; start += pageCapacity) {
    const pageLabels = labeledParts
      .slice(start, start + pageCapacity)
      .map((part) => renderLabel(part, labels))
      .join('');
    pages.push(`<section class="label-page"><div class="label-grid">${pageLabels}</div></section>`);
  }

  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
    `<style>@page{size:${pageSize} portrait;margin:8mm}*{box-sizing:border-box}` +
    `body{font-family:Arial,sans-serif;margin:0;color:#000;background:#fff}` +
    `.label-page{break-after:page;page-break-after:always}.label-page:last-child{break-after:auto;page-break-after:auto}` +
    `.label-grid{display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));grid-template-rows:repeat(${rows},minmax(30mm,auto));align-content:start;gap:2mm}` +
    `.label{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm;break-inside:avoid;page-break-inside:avoid;overflow-wrap:anywhere;border:1px solid #555;padding:2mm;margin:0;text-align:center;min-width:0;min-height:30mm;font-size:8pt}` +
    `.label strong{font-size:11pt;margin-bottom:1mm}.label .qr{display:block;width:16mm;height:16mm;flex:none}` +
    `.label span{display:block}.label-page{min-height:${pageSize === 'A4' ? '280mm' : '263mm'}}` +
    `</style></head><body><main>${pages.join('')}</main></body></html>`
  );
}
