import { mapTvhDvrRow, tvhDvrUrl } from './tvh.client';

describe('tvh DVR', () => {
  it('builds a ticketless dvrfile URL', () => {
    expect(tvhDvrUrl('http://10.0.0.172:9981/', 'abc-uuid')).toBe(
      'http://10.0.0.172:9981/dvrfile/abc-uuid',
    );
  });

  it('prefers disp_title over localized title object', () => {
    const row = mapTvhDvrRow({
      uuid: 'u1',
      disp_title: 'Jeopardy!',
      title: { eng: 'Jeopardy' },
      start: 1_000,
      stop: 2_800,
      channelname: 'WLS-HD',
    });
    expect(row).toMatchObject({
      uuid: 'u1',
      title: 'Jeopardy!',
      durationSec: 1800,
      channelName: 'WLS-HD',
    });
  });

  it('reads title.eng when disp_title is missing', () => {
    const row = mapTvhDvrRow({
      uuid: 'u2',
      title: { eng: 'Nightly News' },
      start: 0,
      stop: 90,
    });
    expect(row?.title).toBe('Nightly News');
    expect(row?.durationSec).toBe(90);
  });

  it('drops rows without uuid', () => {
    expect(mapTvhDvrRow({ title: 'Nope', start: 0, stop: 10 })).toBeNull();
  });
});
