import { expect, test } from './fixtures/app';

test('primary panels remain reachable in pseudo-locales at 320px', async ({ appPage: page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Pseudo-locale responsive coverage runs in Chromium.');
  test.setTimeout(60_000);

  for (const locale of ['en-XA', 'ar-XB'] as const) {
    await page.goto('./');
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate((pseudoLocale) => {
      const transformedText = new WeakMap<Text, string>();
      const transformedAttributes = new WeakMap<Element, Map<string, string>>();
      const accents: Readonly<Record<string, string>> = {
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
      const localize = (value: string) => {
        if (pseudoLocale === 'ar-XB') return `\u2067${value}\u2069`;
        const accented = value
          .split(/(\{\{[^{}]+\}\})/g)
          .map((part) =>
            part.startsWith('{{') ? part : part.replace(/[aeiou]/gi, (character) => accents[character] ?? character),
          )
          .join('');
        const minimumLength = Math.ceil(value.length * 1.4);
        return `${accented}${'\u00b7'.repeat(Math.max(0, minimumLength - accented.length))}`;
      };

      document.documentElement.lang = pseudoLocale;
      document.documentElement.dir = pseudoLocale === 'ar-XB' ? 'rtl' : 'ltr';

      const transform = (root: Node) => {
        if (root.nodeType === Node.TEXT_NODE) {
          const text = root as Text;
          const current = text.nodeValue ?? '';
          if (!current.trim() || transformedText.get(text) === current) return;
          const localized = localize(current);
          transformedText.set(text, localized);
          text.nodeValue = localized;
          return;
        }
        if (!(root instanceof Element)) return;

        let previousAttributes = transformedAttributes.get(root);
        if (!previousAttributes) {
          previousAttributes = new Map();
          transformedAttributes.set(root, previousAttributes);
        }
        for (const attribute of ['aria-label', 'placeholder', 'title']) {
          const current = root.getAttribute(attribute);
          if (current === null || previousAttributes.get(attribute) === current) continue;
          const localized = localize(current);
          previousAttributes.set(attribute, localized);
          root.setAttribute(attribute, localized);
        }
        for (const child of root.childNodes) transform(child);
      };

      transform(document.body);
      new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === 'attributes') transform(record.target);
          else if (record.type === 'characterData') transform(record.target);
          else for (const node of record.addedNodes) transform(node);
        }
      }).observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['aria-label', 'placeholder', 'title'],
      });
    }, locale);

    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar-XB' ? 'rtl' : 'ltr');

    const main = page.getByRole('main');
    const tabs = page.getByRole('tablist').first().getByRole('tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    for (let index = 0; index < tabCount; index += 1) {
      const tab = tabs.nth(index);
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      const layout = await main.evaluate((mainElement) => {
        const panelWidth = mainElement.clientWidth;
        const visible = (element: Element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
        };
        const panelBounds = mainElement.getBoundingClientRect();
        const offscreenControls = Array.from(
          mainElement.querySelectorAll(
            'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="slider"], label',
          ),
        )
          .filter((element) => {
            if (!visible(element)) return false;
            for (
              let ancestor = element.parentElement;
              ancestor && ancestor !== mainElement;
              ancestor = ancestor.parentElement
            ) {
              const overflowX = getComputedStyle(ancestor).overflowX;
              if (overflowX === 'auto' || overflowX === 'scroll') return false;
            }
            const rect = element.getBoundingClientRect();
            return rect.left < panelBounds.left || rect.right > panelBounds.right;
          })
          .map((element) => element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName);
        const clippedText = Array.from(mainElement.querySelectorAll('*')).flatMap((element) => {
          const hasText = Array.from(element.childNodes).some(
            (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
          );
          if (!hasText || !visible(element)) return [];
          for (
            let ancestor: Element | null = element;
            ancestor && ancestor !== mainElement;
            ancestor = ancestor.parentElement
          ) {
            const style = getComputedStyle(ancestor);
            const clipsText =
              ['hidden', 'clip'].includes(style.overflowX) ||
              ['hidden', 'clip'].includes(style.overflowY) ||
              style.textOverflow === 'ellipsis' ||
              style.webkitLineClamp !== 'none';
            if (
              clipsText &&
              (ancestor.scrollWidth > ancestor.clientWidth + 1 || ancestor.scrollHeight > ancestor.clientHeight + 1)
            ) {
              return [element.textContent?.trim().slice(0, 80) ?? element.tagName];
            }
          }
          return [];
        });

        return {
          panelWidth,
          panelScrollWidth: mainElement.scrollWidth,
          offscreenControls,
          clippedText,
        };
      });

      const scenario = `${locale}, primary panel ${index + 1}`;
      expect(layout.panelScrollWidth, `${scenario}: horizontal overflow`).toBeLessThanOrEqual(layout.panelWidth);
      expect(layout.offscreenControls, `${scenario}: controls outside viewport`).toEqual([]);
      expect(layout.clippedText, `${scenario}: clipped visible text`).toEqual([]);
    }
  }
});
