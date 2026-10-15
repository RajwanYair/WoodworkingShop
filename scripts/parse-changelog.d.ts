interface ChangelogEntry {
  category: string;
  summary: string;
}

export function parseUnreleasedChangelog(markdown: string): ChangelogEntry[];
