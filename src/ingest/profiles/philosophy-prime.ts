import type { ParseProfile } from '../parse-filename';
import {
  MAGEE_SERIES_BY_GUEST,
  PHILOSOPHY_PRIME_FOLDERS,
  PHILOSOPHY_PRIME_SERIES,
} from '../../catalog/philosophy-prime';

export const philosophyPrimeParseProfile: ParseProfile = {
  folders: PHILOSOPHY_PRIME_FOLDERS,
  guestSeries: MAGEE_SERIES_BY_GUEST,
  aliases: Object.fromEntries(
    PHILOSOPHY_PRIME_SERIES.flatMap((row) => [
      [row.seriesTitle.toLowerCase(), row.seriesTitle],
      ...row.aliases.map((alias) => [alias.toLowerCase(), row.seriesTitle]),
    ]),
  ),
  junk: /\b(720p|1080p|2160p|bluray|webrip|web-dl|webdl|x264|x265|hevc|aac|lecture|complete|season|yale|harvard|bbc|pbs)\b/gi,
  skipIf: (stem) =>
    /star trek|generations|nexus|kirk'?s death|christmas hug/i.test(stem),
};
