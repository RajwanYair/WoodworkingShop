import type { Page } from '@playwright/test';

declare global {
  interface Window {
    __e2ePseudoLocaleOriginals?: WeakMap<Text, string>;
  }
}

export type PseudoLocale = 'en-XA' | 'ar-XB';

const ACCENTS: Record<string, string> = {
  a: 'á',
  b: 'ƀ',
  c: 'ç',
  d: 'ď',
  e: 'é',
  f: 'ƒ',
  g: 'ğ',
  h: 'ħ',
  i: 'í',
  j: 'ĵ',
  k: 'ķ',
  l: 'ľ',
  m: 'ḿ',
  n: 'ń',
  o: 'ó',
  p: 'þ',
  q: 'ǫ',
  r: 'ŕ',
  s: 'š',
  t: 'ŧ',
  u: 'ú',
  v: 'ṽ',
  w: 'ŵ',
  x: 'ẋ',
  y: 'ý',
  z: 'ž',
};

const TOKEN_SPLITTER = /(\{\{[^{}]+\}\})/g;

function pseudoLocalizeSegment(segment: string, locale: PseudoLocale): string {
  if (!segment || /^\s+$/.test(segment)) return segment;
  if (locale === 'ar-XB') return `\u202b${segment}\u202c`;

  const accented = [...segment]
    .map((character) => {
      const accent = ACCENTS[character.toLowerCase()];
      if (!accent) return character;
      return character === character.toUpperCase() ? accent.toUpperCase() : accent;
    })
    .join('');
  let paddingLength = Math.max(0, Math.ceil(segment.length * 0.4) - 2);
  const words = accented.split(/(\s+)/);
  const wordCount = words.filter((word) => word.length > 0 && !/^\s+$/.test(word)).length;
  let remainingWords = wordCount;
  const expanded = words
    .map((word) => {
      if (!word || /^\s+$/.test(word)) return word;
      const padding = remainingWords > 0 ? Math.floor(paddingLength / remainingWords) : 0;
      paddingLength -= padding;
      remainingWords -= 1;
      return `${word}${'-'.repeat(padding)}`;
    })
    .join('');
  return `［${expanded}］`;
}

export function pseudoLocalize(value: string, locale: PseudoLocale): string {
  return value
    .split(TOKEN_SPLITTER)
    .map((segment) => (/^\{\{[^{}]+\}\}$/.test(segment) ? segment : pseudoLocalizeSegment(segment, locale)))
    .join('');
}

export async function applyPseudoLocale(page: Page, locale: PseudoLocale): Promise<void> {
  const main = page.getByRole('main');
  const sourceText = await main.evaluate((root) => {
    const originals = (window.__e2ePseudoLocaleOriginals ??= new WeakMap());
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node instanceof Text && !node.parentElement?.closest('option')) nodes.push(node);
    }
    return nodes.map((node) => {
      const original = originals.get(node) ?? node.data;
      originals.set(node, original);
      return original;
    });
  });
  const translatedText = sourceText.map((value) => pseudoLocalize(value, locale));

  await main.evaluate(
    (root, update) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node instanceof Text && !node.parentElement?.closest('option')) nodes.push(node);
      }
      nodes.forEach((node, index) => {
        node.data = update.text[index] ?? node.data;
      });
      root.dataset.e2ePseudoLocale = update.locale;
    },
    { locale, text: translatedText },
  );
}
