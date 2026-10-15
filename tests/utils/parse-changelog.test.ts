import { describe, expect, it } from 'vitest';
import { parseUnreleasedChangelog } from '../../scripts/parse-changelog.js';

describe('parseUnreleasedChangelog', () => {
  it('returns categorized top-level entries from only the unreleased section', () => {
    const markdown = [
      '# Changelog',
      '## [Unreleased]',
      '### Added',
      '- Added the project gallery.',
      '  Additional implementation details.',
      '### Fixed',
      '- Corrected tab navigation.',
      '## [5.36.0] - 2026-10-13',
      '### Added',
      '- This released entry must be excluded.',
    ].join('\n');

    expect(parseUnreleasedChangelog(markdown)).toEqual([
      { category: 'Added', summary: 'Added the project gallery.' },
      { category: 'Fixed', summary: 'Corrected tab navigation.' },
    ]);
  });

  it.each(['# Changelog', '## [Unreleased]\n- Uncategorised entry'])(
    'returns no entries when no categorized unreleased content exists',
    (markdown) => {
      expect(parseUnreleasedChangelog(markdown)).toEqual([]);
    },
  );
});
