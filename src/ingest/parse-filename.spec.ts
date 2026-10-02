import { parseMediaFilename } from './parse-filename';
import { philosophyPrimeParseProfile } from './profiles/philosophy-prime';

it('links Sandel episode 01 to Justice', () => {
  const parsed = parseMediaFilename(
    "/mnt/nas/videos/philosophy/Michael-Sandel-Justice/Justice： What's The Right Thing To Do？ Episode 01 ＂THE MORAL SIDE OF MURDER＂ [kBdfcR-8hEY].webm",
    philosophyPrimeParseProfile,
  );
  expect(parsed).toEqual({
    kind: 'episode',
    seriesTitle: 'Justice',
    season: 1,
    episode: 1,
    episodeTitle: expect.any(String),
  });
});
