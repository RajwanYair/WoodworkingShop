export type PseudoLocale = 'en-XA' | 'ar-XB';

type LocaleNode = string | { readonly [key: string]: LocaleNode };
type PseudoNode<T extends LocaleNode> = T extends string
  ? string
  : T extends { readonly [key: string]: LocaleNode }
    ? { readonly [Key in keyof T]: PseudoNode<T[Key]> }
    : never;

const ACCENTED_CHARACTERS: Readonly<Record<string, string>> = {
  a: '\u00e1',
  A: '\u00c1',
  e: '\u00eb',
  E: '\u00cb',
  i: '\u00ef',
  I: '\u00cf',
  o: '\u00f6',
  O: '\u00d6',
  u: '\u00fc',
  U: '\u00dc',
};

function pseudoLocalizeValue(value: string, locale: PseudoLocale): string {
  if (locale === 'ar-XB') return `\u2067${value}\u2069`;

  const accented = value
    .split(/(\{\{[^{}]+\}\})/g)
    .map((part) =>
      part.startsWith('{{')
        ? part
        : part.replace(/[aeiou]/gi, (character) => ACCENTED_CHARACTERS[character] ?? character),
    )
    .join('');
  const targetLength = Math.ceil(value.length * 1.4);
  return `${accented}${'\u00b7'.repeat(targetLength - accented.length)}`;
}

export function createPseudoLocale<T extends LocaleNode>(source: T, locale: PseudoLocale): PseudoNode<T> {
  if (typeof source === 'string') return pseudoLocalizeValue(source, locale) as PseudoNode<T>;

  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, createPseudoLocale(value, locale)]),
  ) as PseudoNode<T>;
}
