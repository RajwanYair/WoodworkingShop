import type { LabeledPart } from '../../engine/part-labeling';

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

export function buildPartLabelPrintHtml(labeledParts: readonly LabeledPart[], title: string): string {
  const printContent = labeledParts
    .map(
      (part) =>
        `<div class="label"><strong>${escapeHtml(part.partLabel)}</strong><br>${escapeHtml(part.name.en)}<br>${part.length} × ${part.width}<br>${escapeHtml(part.material)}${part.qty > 1 ? ` ×${part.qty}` : ''}</div>`,
    )
    .join('');

  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
    `<style>@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}` +
    `body{font-family:monospace;margin:0}` +
    `.label-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2mm}` +
    `.label{display:flex;flex-direction:column;align-items:center;justify-content:center;break-inside:avoid;page-break-inside:avoid;overflow-wrap:anywhere;border:1px solid #888;padding:4mm;margin:0;text-align:center;min-width:0;min-height:30mm;font-size:10pt}` +
    `strong{font-size:14pt;display:block;margin-bottom:2mm}` +
    `@media print{.label-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}</style>` +
    `</head><body><main class="label-grid">${printContent}</main></body></html>`
  );
}
