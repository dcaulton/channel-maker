export type ParsedMovie = {
  kind: 'movie';
  title: string;
  year: number;
};

export type ParsedEpisode = {
  kind: 'episode';
  seriesTitle: string;
  season: number;
  episode: number;
  episodeTitle?: string;
};

export type ParsedSkip = { kind: 'skip'; reason: string };

export type ParsedMedia = ParsedMovie | ParsedEpisode | ParsedSkip;

export type ParseProfile = {
  aliases?: Record<string, string>;
  junk?: RegExp;
  skipIf?: (stem: string) => boolean;
  folders?: Record<string, string>;
  guestSeries?: Record<string, string>;
  pathIncludes?: { match: string; seriesTitle: string }[];
};

const DEFAULT_JUNK =
  /\b(720p|1080p|2160p|bluray|webrip|web-dl|hdtv|x264|x265|hevc|proper|repack)\b/gi;

function cleanTitle(raw: string, junk: RegExp): string {
  return raw
    .replace(/[._]+/g, ' ')
    .replace(junk, ' ')
    .replace(/[[\](){}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function alias(series: string, aliases: Record<string, string>): string {
  const key = series.toLowerCase();
  return aliases[key] ?? series;
}

export function parseMediaFilename(
  filePath: string,
  profile: ParseProfile = {},
): ParsedMedia {
  const junk = profile.junk ?? DEFAULT_JUNK;
  const aliases = profile.aliases ?? {};
  const base = filePath.split(/[/\\]/).pop() ?? filePath;
  const stem = base.replace(/\.(mkv|mp4|m4v|avi|ts|webm|m2ts)$/i, '');

  if (profile.skipIf?.(stem) ?? /\bextras?\b/i.test(stem)) {
    return { kind: 'skip', reason: 'extras' };
  }

  const tftcCompact = stem.match(/^tftc\.(\d)(\d{2})\b/i);
  if (tftcCompact) {
    return {
      kind: 'episode',
      seriesTitle: alias('tftc', aliases),
      season: Number(tftcCompact[1]),
      episode: Number(tftcCompact[2]),
    };
  }

  const sxe = stem.match(
    /(?:^|[.\s_-])s(?:eason)?\s*(\d{1,2})[.\s_-]*e(?:p(?:isode)?)?\s*(\d{1,2})\b/i,
  );
  if (sxe) {
    const season = Number(sxe[1]);
    const episode = Number(sxe[2]);
    const before = stem.slice(0, sxe.index);
    const after = stem.slice((sxe.index ?? 0) + sxe[0].length);
    const fromFile = cleanTitle(before, junk);
    const fromDir = seriesFromParents(filePath, junk, aliases);
    const seriesTitle = canonicalSeries(
      fromFile || fromDir || 'Unknown',
      junk,
      aliases,
    );
    const episodeTitle =
      cleanTitle(after.replace(/^[-.\s]+/, ''), junk) || undefined;
    return {
      kind: 'episode',
      seriesTitle,
      season,
      episode,
      episodeTitle,
    };
  }

  const yearHit = stem.match(/\b(19|20)\d{2}\b/);
  if (yearHit) {
    const year = Number(yearHit[0]);
    const title = cleanTitle(stem.replace(yearHit[0], ' '), junk);
    if (title.length >= 2) {
      return { kind: 'movie', title, year };
    }
  }

  const normalizedStem = stem
    .replace(/\[[\w-]{6,}\]/g, ' ')
    .replace(/[：？＂]/g, ' ');

  if (profile.skipIf?.(normalizedStem) ?? /\bextras?\b/i.test(normalizedStem)) {
    return { kind: 'skip', reason: 'extras' };
  }

  //  const fromFolder =
  //    seriesFromFolder(filePath, profile.folders) ||
  //    (filePath.toLowerCase().includes('sandel') ? 'Justice' : '') ||
  //    (filePath.toLowerCase().includes('kagan') ? 'Death' : '') ||
  //    (filePath.toLowerCase().includes('steven-b-smith')
  //      ? 'Introduction to Political Philosophy'
  //      : '') ||
  //    (filePath.toLowerCase().includes('millican') ? 'General Philosophy' : '') ||
  //    (filePath.toLowerCase().includes('gendler')
  //      ? 'Philosophy and the Science of Human Nature'
  //      : '');
  const fromFolder = seriesFromPath(filePath, profile);

  const episodeWord = normalizedStem.match(/episode\s+(\d{1,2})\b/i);
  if (episodeWord && fromFolder) {
    return {
      kind: 'episode',
      seriesTitle: fromFolder,
      season: 1,
      episode: Number(episodeWord[1]),
      episodeTitle: cleanTitle(normalizedStem, junk),
    };
  }

  const fromGuest = seriesFromGuest(normalizedStem, profile.guestSeries);
  const folderOrGuest = fromGuest || fromFolder;

  const dotted = normalizedStem.match(/^(\d+)\.(\d+)\b/);
  if (dotted && folderOrGuest) {
    return {
      kind: 'episode',
      seriesTitle: alias(folderOrGuest, aliases),
      season: Number(dotted[1]),
      episode: Number(dotted[2]),
      episodeTitle: cleanTitle(
        normalizedStem.replace(/^(\d+)\.(\d+)\b/, ''),
        junk,
      ),
    };
  }

  if (episodeWord && folderOrGuest) {
    return {
      kind: 'episode',
      seriesTitle: alias(folderOrGuest, aliases),
      season: 1,
      episode: Number(episodeWord[1]),
      episodeTitle: cleanTitle(
        normalizedStem.replace(/episode\s+\d{1,2}\b/i, ''),
        junk,
      ),
    };
  }

  const leading = normalizedStem.match(/^(\d+)\.\s+/);
  if (leading && folderOrGuest) {
    return {
      kind: 'episode',
      seriesTitle: alias(folderOrGuest, aliases),
      season: 1,
      episode: Number(leading[1]),
      episodeTitle: cleanTitle(normalizedStem.replace(/^\d+\.\s+/, ''), junk),
    };
  }

  if (/chomsky|foucault/i.test(normalizedStem)) {
    return { kind: 'movie', title: 'Chomsky vs Foucault', year: 1971 };
  }
  if (/russell|copleston/i.test(normalizedStem)) {
    return { kind: 'movie', title: 'Russell vs Copleston', year: 1948 };
  }

  if (fromGuest) {
    const yt = stem.match(/\[([A-Za-z0-9_-]{6,})\]/);
    const episode = yt ? (Math.abs(hash32(yt[1])) % 9000) + 1 : 1;
    return {
      kind: 'episode',
      seriesTitle: alias(fromGuest, aliases),
      season: 1,
      episode,
      episodeTitle: cleanTitle(normalizedStem, junk),
    };
  }

  function seriesFromFolder(
    filePath: string,
    folders?: Record<string, string>,
  ): string {
    if (!folders) {
      return '';
    }
    const parts = filePath.split(/[/\\]/);
    for (let i = parts.length - 2; i >= 0; i -= 1) {
      const key = parts[i].toLowerCase();
      if (folders[key]) {
        return folders[key];
      }
    }
    return '';
  }

  function seriesFromPath(filePath: string, profile: ParseProfile): string {
    const fromFolder = seriesFromFolder(filePath, profile.folders);
    if (fromFolder) {
      return fromFolder;
    }
    const lower = filePath.toLowerCase();
    for (const hint of profile.pathIncludes ?? []) {
      if (lower.includes(hint.match.toLowerCase())) {
        return hint.seriesTitle;
      }
    }
    return '';
  }

  function seriesFromGuest(
    stem: string,
    guests?: Record<string, string>,
  ): string {
    if (!guests) {
      return '';
    }
    const lower = stem.toLowerCase();
    for (const [token, series] of Object.entries(guests)) {
      if (lower.includes(token)) {
        return series;
      }
    }
    return '';
  }

  function hash32(value: string): number {
    let h = 0;
    for (let i = 0; i < value.length; i += 1) {
      h = (h * 31 + value.charCodeAt(i)) | 0;
    }
    return h;
  }
  return { kind: 'skip', reason: 'unparsed' };
}

function canonicalSeries(
  raw: string,
  junk: RegExp,
  aliases: Record<string, string>,
): string {
  const cleaned = cleanTitle(raw, junk)
    .replace(/\b(19|20)\d{2}\b/g, ' ')
    .replace(/\s*[-–—]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return alias(cleaned, aliases);
}

function seriesFromParents(
  filePath: string,
  junk: RegExp,
  aliases: Record<string, string>,
): string {
  const parts = filePath.split(/[/\\]/).slice(0, -1);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const cleaned = cleanTitle(parts[i].replace(/s\d{2}.*/i, ' '), junk);
    if (!cleaned || /^season\s*\d+$/i.test(cleaned)) {
      continue;
    }
    return canonicalSeries(cleaned, junk, aliases);
  }
  return '';
}
