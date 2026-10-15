import { describe, expect, it } from 'vitest';
import { inertOutsideDialog } from '../../src/ui/dialog-inert';

describe('inertOutsideDialog', () => {
  it('marks cousins inert and leaves the dialog branch active', () => {
    document.body.replaceChildren();
    document.body.innerHTML = `
      <header id="header"></header>
      <main>
        <section id="table"><input id="qty" /></section>
        <section id="sheet"><dialog id="gcode"></dialog></section>
      </main>
    `;
    const dialog = document.getElementById('gcode');
    if (!(dialog instanceof HTMLElement)) throw new Error('missing dialog');

    const release = inertOutsideDialog(dialog);

    expect(document.getElementById('header')?.hasAttribute('inert')).toBe(true);
    expect(document.getElementById('table')?.hasAttribute('inert')).toBe(true);
    expect(document.getElementById('sheet')?.hasAttribute('inert')).toBe(false);
    expect(dialog.hasAttribute('inert')).toBe(false);

    release();

    expect(document.getElementById('header')?.hasAttribute('inert')).toBe(false);
    expect(document.getElementById('table')?.hasAttribute('inert')).toBe(false);
  });

  it('does not clear an inert attribute that was already present', () => {
    document.body.replaceChildren();
    document.body.innerHTML = '<div id="already" inert></div><dialog id="dlg"></dialog>';
    const dialog = document.getElementById('dlg');
    if (!(dialog instanceof HTMLElement)) throw new Error('missing dialog');

    inertOutsideDialog(dialog)();

    expect(document.getElementById('already')?.hasAttribute('inert')).toBe(true);
  });
});
