import { isPlayableUrl, seriesTitlesFromPayload } from './series-from-payload';

describe('seriesTitlesFromPayload', () => {
  it('collects seriesTitle and seriesTitles[]', () => {
    expect(
      seriesTitlesFromPayload({
        items: [
          { seriesTitle: 'Justice' },
          { seriesTitles: ['Death', 'Justice'] },
          { title: 'slate only' },
        ],
      }),
    ).toEqual(['Justice', 'Death']);
  });

  it('returns [] for junk', () => {
    expect(seriesTitlesFromPayload(null)).toEqual([]);
    expect(seriesTitlesFromPayload({ items: 'nope' })).toEqual([]);
  });
});

describe('isPlayableUrl', () => {
  it('accepts http and tvh paths', () => {
    expect(isPlayableUrl('http://10.0.0.89:8088/x.webm')).toBe(true);
    expect(isPlayableUrl('http://10.0.0.172:9981/dvrfile/abc')).toBe(true);
    expect(isPlayableUrl('/mnt/nas/videos/x.mkv')).toBe(false);
  });
});
