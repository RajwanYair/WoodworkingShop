export function parseUnreleasedChangelog(markdown) {
  const heading = '## [Unreleased]';
  const start = markdown.indexOf(heading);
  if (start < 0) return [];

  const contentStart = start + heading.length;
  const nextRelease = markdown.indexOf('\n## [', contentStart);
  const section = markdown.slice(contentStart, nextRelease < 0 ? undefined : nextRelease);
  const entries = [];
  let category = '';

  for (const line of section.split(/\r?\n/)) {
    const categoryMatch = /^###\s+(.+?)\s*$/.exec(line);
    if (categoryMatch) {
      category = categoryMatch[1];
      continue;
    }

    const entryMatch = /^-\s+(.+?)\s*$/.exec(line);
    if (entryMatch && category) entries.push({ category, summary: entryMatch[1] });
  }

  return entries;
}
