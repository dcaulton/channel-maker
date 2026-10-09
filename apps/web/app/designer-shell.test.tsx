import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DesignerShell } from './designer-shell';

describe('DesignerShell', () => {
  it('frames works, clock, and preview without calling the API', () => {
    const html = renderToStaticMarkup(<DesignerShell />);

    expect(html).toContain('Works');
    expect(html).toContain('Clock');
    expect(html).toContain('Preview');
    expect(html).toContain('Theme slot');
    expect(html).toContain('Nothing selected');
    expect(html).not.toContain('playlist.m3u');
  });
});
