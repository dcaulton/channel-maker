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
  const stem = base.replace(/\.(mkv|mp4|m4v|avi|ts|m2ts)$/i, '');

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
