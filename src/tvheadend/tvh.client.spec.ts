import { tvhStreamUrl } from './tvh.client';

describe('tvhStreamUrl', () => {
  it('builds a ticketless UUID stream URL', () => {
    expect(
      tvhStreamUrl(
        'http://10.0.0.172:9981/',
        'e19e4fdf0a794774e20b2192841b321a',
      ),
    ).toBe(
      'http://10.0.0.172:9981/stream/channel/e19e4fdf0a794774e20b2192841b321a',
    );
  });
});
