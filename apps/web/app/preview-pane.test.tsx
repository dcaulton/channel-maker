import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PreviewPane } from './preview-pane';

describe('PreviewPane', () => {
  it('points the player at the slot url', () => {
    const html = renderToStaticMarkup(
      <PreviewPane
        title="Justice 1"
        sourceUrl="http://10.0.0.89:8088/philosophy/justice-1.webm"
        fallback={null}
      />,
    );
    expect(html).toContain('http://10.0.0.89:8088/philosophy/justice-1.webm');
    expect(html).toContain('<video');
  });
});
