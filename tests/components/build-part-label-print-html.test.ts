import { describe, expect, it } from 'vitest';
import { buildPartLabelPrintHtml } from '../../src/components/optimizer/build-part-label-print-html';
import type { LabeledPart } from '../../src/engine/part-labeling';

const part: LabeledPart = {
  id: 'side-panel',
  name: { en: '<img src=x onerror=alert(1)>', he: 'צד' },
  qty: 2,
  material: 'plywood-18&<script>',
  thickness: 18,
  length: 600,
  width: 400,
  edgeBanding: { en: 'none', he: 'ללא' },
  partLabel: 'P-001',
};

describe('buildPartLabelPrintHtml', () => {
  it('escapes part content, labels, material and title as text', () => {
    const html = buildPartLabelPrintHtml([{ ...part, partLabel: '<b>label</b>' }], '<title>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('plywood-18&amp;&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;label&lt;/b&gt;');
    expect(html).toContain('&lt;title&gt;');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('data-qr-reference');
  });

  it('prints material, dimensions, quantity and a QR reference for generated labels', () => {
    const html = buildPartLabelPrintHtml([part], 'Part Labels');
    expect(html).toContain('600 × 400 × 18 mm');
    expect(html).toContain('plywood-18&amp;&lt;script&gt;');
    expect(html).toContain('Quantity: 2');
    expect(html).toContain('P-001');
    expect(html).toContain('data-qr-reference="true"');
  });

  it('uses the selected paper size and bounded label grid', () => {
    const html = buildPartLabelPrintHtml([part], 'Part Labels', { pageSize: 'Letter', rows: 4, columns: 2 });
    expect(html).toContain('@page{size:Letter portrait');
    expect(html).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
    expect(html).toContain('grid-template-rows:repeat(4,minmax(30mm,auto))');
  });

  it('defaults to a legible four-row, two-column label grid', () => {
    const html = buildPartLabelPrintHtml([part], 'Part Labels');
    expect(html).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
    expect(html).toContain('grid-template-rows:repeat(4,minmax(30mm,auto))');
  });
});
