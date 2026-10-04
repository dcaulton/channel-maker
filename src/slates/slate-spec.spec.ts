import { basicRendererName, buildSlateSpec } from './slate-spec';
import { resolveRenderer } from './renderers/registry';
import { BasicSlateRenderer } from './basic-slate-renderer';
import { VhsSlateRenderer } from './renderers/vhs-slate-renderer';

describe('slate renderer selection', () => {
  it('treats empty, plain, and 0 as the basic renderer', () => {
    for (const name of ['', '0', 'plain', undefined]) {
      expect(basicRendererName(name)).toBe('');
      expect(resolveRenderer(name)).toBeInstanceOf(BasicSlateRenderer);
      expect(resolveRenderer(name)).not.toBeInstanceOf(VhsSlateRenderer);
    }
  });

  it('selects a subclass when the renderer name is present', () => {
    const renderer = resolveRenderer('vhs');
    expect(renderer).toBeInstanceOf(VhsSlateRenderer);
    expect(renderer).toBeInstanceOf(BasicSlateRenderer);
  });

  it('refuses an unknown renderer name', () => {
    expect(() => resolveRenderer('crayon')).toThrow('No slate renderer');
  });
});

describe('slate spec', () => {
  it('builds role-tagged lines and an image before ffmpeg', async () => {
    const spec = await buildSlateSpec({
      kind: 'station-id',
      channelId: 'ch1',
      channelName: 'Philosophy Prime',
      now: new Date('2026-10-04T17:54:00.000Z'),
    });
    expect(spec.renderer).toBe('');
    expect(spec.lines.map((line) => line.role)).toEqual([
      'title',
      'body',
      'body',
    ]);
    expect(spec.lines[0].text).toBe('PHILOSOPHY PRIME');
    expect(spec.lines[2].text).toMatch(/PM|AM/);
    expect(spec.imagePath).toMatch(/station-id\.png$/);
    expect(spec.bedPath).toMatch(/audio\/a\.wav$/);
  });

  it('names commercial and seasonal cards', async () => {
    const commercial = await buildSlateSpec({
      kind: 'commercial',
      channelId: 'ch1',
      channelName: 'Spooky',
      now: new Date('2026-10-04T17:00:00.000Z'),
    });
    const seasonal = await buildSlateSpec({
      kind: 'seasonal',
      channelId: 'ch1',
      channelName: 'Spooky',
      now: new Date('2026-10-04T17:00:00.000Z'),
    });
    expect(commercial.lines[0].text).toBe('COMMERCIAL');
    expect(seasonal.lines[0].text).toBe('SPOOKY SEASON');
    expect(seasonal.lines[1].text).toMatch(/October/);
  });
});
