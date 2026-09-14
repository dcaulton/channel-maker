import type { ParseProfile } from '../parse-filename';

export const spookyStoriesParseProfile: ParseProfile = {
  aliases: {
    crypt: 'Tales from the Crypt',
    tftc: 'Tales from the Crypt',
    'tales from the crypt': 'Tales from the Crypt',
    creepshow: 'Creepshow',
    'cabinet of curiosities': 'Cabinet of Curiosities',
    "guillermo del toro's cabinet of curiosities": 'Cabinet of Curiosities',
    'guillermo del toros cabinet of curiosities': 'Cabinet of Curiosities',
    'hammer house of horror': 'Hammer House of Horror',
    'hammer house of mystery and suspense':
      'Hammer House of Mystery and Suspense',
    'hammer house of mystery & suspense':
      'Hammer House of Mystery and Suspense',
    monsters: 'Monsters',
    'archive 81': 'Archive 81',
    darkroom: 'Darkroom',
    'tales from the darkside': 'Tales from the Darkside',
    "the devil's hour": "The Devil's Hour",
    'the devils hour': "The Devil's Hour",
    'devils hour': "The Devil's Hour",
    'the outer limits': 'The Outer Limits',
    'outer limits': 'The Outer Limits',
  },
  junk: /\b(720p|1080p|2160p|bluray|bdrip|dvdrip|webrip|web-dl|amzn|nf|hdtv|x264|x265|hevc|10bit|eac3|atmos|5\.1|aac|proper|repack|complete|season|galaxytv|jfkxvid|savannah|dimension|ghost|bone|genemige|tgx)\b/gi,
  skipIf: (stem) => /\bextras?\b/i.test(stem),
};
