export function seriesTitlesFromPayload(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    return [];
  }
  const titles = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as { seriesTitle?: unknown; seriesTitles?: unknown };
    if (typeof row.seriesTitle === 'string' && row.seriesTitle.length > 0) {
      titles.add(row.seriesTitle);
    }
    if (Array.isArray(row.seriesTitles)) {
      for (const name of row.seriesTitles) {
        if (typeof name === 'string' && name.length > 0) {
          titles.add(name);
        }
      }
    }
  }
  return [...titles];
}

export function isPlayableUrl(sourceUrl: string): boolean {
  return (
    sourceUrl.startsWith('http://') ||
    sourceUrl.startsWith('https://') ||
    sourceUrl.includes('/dvrfile/') ||
    sourceUrl.includes('/stream/channel/')
  );
}
