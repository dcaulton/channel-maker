import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AddRuleDialog } from './add-rule-dialog';

describe('AddRuleDialog', () => {
  it('offers the two kinds that have a planner', () => {
    const html = renderToStaticMarkup(
      <AddRuleDialog onCancel={() => undefined} onCreate={() => undefined} />,
    );
    expect(html).toContain('windowed-sources');
    expect(html).toContain('rotate-tv-streams');
    expect(html).not.toContain('suggest');
  });
});
