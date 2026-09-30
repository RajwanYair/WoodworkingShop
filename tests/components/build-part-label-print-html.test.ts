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
  });

  it('retains grouped quantity and dimensions in the printable card', () => {
    const html = buildPartLabelPrintHtml([part], 'Part Labels');
    expect(html).toContain('600 × 400');
    expect(html).toContain('plywood-18&amp;&lt;script&gt; ×2');
    expect(html).toContain('P-001');
  });
});
