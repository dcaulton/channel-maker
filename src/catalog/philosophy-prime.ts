export const PHILOSOPHY_PRIME_SLUG = 'philosophy-prime';

export type CatalogSeries = {
  seriesTitle: string;
  aliases: string[];
};

export const PHILOSOPHY_PRIME_SERIES: CatalogSeries[] = [
  {
    seriesTitle: 'The Great Philosophers',
    aliases: ['bryan magee', 'magee 1987', 'great philosophers'],
  },
  {
    seriesTitle: 'Men of Ideas',
    aliases: ['men of ideas', 'magee 1978'],
  },
  {
    seriesTitle: 'Justice',
    aliases: ['sandel', 'sandel justice', 'michael sandel', 'harvard justice'],
  },
  {
    seriesTitle: 'Death',
    aliases: ['kagan', 'shelly kagan', 'yale death', 'phil 176'],
  },
  {
    seriesTitle: 'Introduction to Political Philosophy',
    aliases: ['steven b smith', 'steven smith', 'yale political philosophy'],
  },
  {
    seriesTitle: 'General Philosophy',
    aliases: ['millican', 'peter millican', 'oxford general philosophy'],
  },
  {
    seriesTitle: 'Philosophy and the Science of Human Nature',
    aliases: ['gendler', 'tamar gendler', 'human nature yale'],
  },
  {
    seriesTitle: 'Closer to Truth',
    aliases: ['closer to truth', 'ctt'],
  },
];

export const PHILOSOPHY_PRIME_FOLDERS: Record<string, string> = {
  'michael-sandel-justice': 'Justice',
  'shelly-kagan-death': 'Death',
  'steven-b-smith-introduction-to-political-philosophy':
    'Introduction to Political Philosophy',
  'peter-millican-general-philosophy': 'General Philosophy',
  'tamar-gendler-philosophy-and-the-science-of-human-nature':
    'Philosophy and the Science of Human Nature',
};

export const PHILOSOPHY_PRIME_PATH_HINTS: {
  match: string;
  seriesTitle: string;
}[] = [
  { match: 'michael-sandel-justice', seriesTitle: 'Justice' },
  { match: 'shelly-kagan-death', seriesTitle: 'Death' },
  {
    match: 'steven-b-smith',
    seriesTitle: 'Introduction to Political Philosophy',
  },
  { match: 'peter-millican', seriesTitle: 'General Philosophy' },
  {
    match: 'tamar-gendler',
    seriesTitle: 'Philosophy and the Science of Human Nature',
  },
  { match: 'bryan-magee', seriesTitle: 'The Great Philosophers' },
];

/** Guest token → series. Checked against the cleaned stem. */
export const MAGEE_SERIES_BY_GUEST: Record<string, string> = {
  burnyeat: 'The Great Philosophers',
  nussbaum: 'The Great Philosophers',
  williams: 'The Great Philosophers',
  quinton: 'The Great Philosophers',
  passmore: 'The Great Philosophers',
  warnock: 'The Great Philosophers',
  singer: 'The Great Philosophers',
  copleston: 'The Great Philosophers',
  stern: 'The Great Philosophers',
  dreyfus: 'The Great Philosophers',
  searle: 'The Great Philosophers',
  marcuse: 'Men of Ideas',
  putnam: 'Men of Ideas',
  murdoch: 'Men of Ideas',
  derrida: 'Men of Ideas',
  quine: 'Men of Ideas',
  dreben: 'Men of Ideas',
  boolos: 'Men of Ideas',
  dennett: 'Men of Ideas',
};

export const philosophyPrimeWindows = [
  {
    start: '20:00',
    end: '22:00',
    days: [0],
    mode: 'episodes',
    title: 'Academy',
    seriesTitle: 'Introduction to Political Philosophy',
    overflow: 'slate',
  },
  {
    start: '20:00',
    end: '22:00',
    days: [1],
    mode: 'episodes',
    title: 'Canon',
    seriesTitles: ['The Great Philosophers', 'Men of Ideas'],
    overflow: 'slate',
  },
  {
    start: '20:00',
    end: '22:00',
    days: [2],
    mode: 'episodes',
    title: 'Agora',
    seriesTitle: 'Justice',
    overflow: 'slate',
  },
  {
    start: '20:00',
    end: '22:00',
    days: [3],
    mode: 'episodes',
    title: 'Mortality',
    seriesTitle: 'Death',
    overflow: 'slate',
  },
  {
    start: '20:00',
    end: '22:00',
    days: [4],
    mode: 'episodes',
    title: 'Oxford',
    seriesTitle: 'General Philosophy',
    overflow: 'slate',
  },
  {
    start: '20:00',
    end: '22:00',
    days: [5],
    mode: 'episodes',
    title: 'Human nature',
    seriesTitle: 'Philosophy and the Science of Human Nature',
    overflow: 'slate',
  },
  {
    start: '20:00',
    end: '22:00',
    days: [6],
    mode: 'episodes',
    title: 'Life / debates later',
    seriesTitles: ['Justice', 'Death'],
    overflow: 'slate',
  },
];
