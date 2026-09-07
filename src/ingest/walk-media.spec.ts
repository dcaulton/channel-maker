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
});
