import { toSourceUrl } from './walk-media';

describe('toSourceUrl', () => {
  it('uses the filesystem path when publicBase is omitted', () => {
    expect(toSourceUrl('/mnt/nas/tv/a.mkv', '/mnt/nas/tv')).toBe(
      '/mnt/nas/tv/a.mkv',
    );
  });

  it('rewrites a relative path onto an HTTP base', () => {
    expect(
      toSourceUrl(
        '/mnt/nas/tv/show/e01.mkv',
        '/mnt/nas/tv',
        'http://10.0.0.50/media',
      ),
    ).toBe('http://10.0.0.50/media/show/e01.mkv');
  });

  it('encodes spaces and parentheses', () => {
    expect(
      toSourceUrl(
        '/mnt/nas/videos/Archive 81 (2022)/S01E01.mkv',
        '/mnt/nas/videos',
        'http://10.0.0.89:8088',
      ),
    ).toBe('http://10.0.0.89:8088/Archive%2081%20(2022)/S01E01.mkv');
  });
});
