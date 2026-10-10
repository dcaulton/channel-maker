import { rotatePayloadSchema, type Rule } from '@channel-maker/contracts';

export function RuleSummary({ rule }: { rule: Rule }) {
  if (rule.kind === 'rotate-tv-streams') {
    const payload = rotatePayloadSchema.safeParse(rule.payload);
    if (payload.success) {
      const hours = payload.data.slotDurationSec / 3600;
      return (
        <section className="card" aria-label="Rule">
          <h2>rotate-tv-streams</h2>
          <p className="note">{hours}h blocks</p>
          <ol className="log">
            {payload.data.streamTitles.map((title) => (
              <li key={title}>
                <div className="slot">
                  <strong>{title}</strong>
                </div>
              </li>
            ))}
          </ol>
        </section>
      );
    }
  }

  const payload =
    rule.payload && typeof rule.payload === 'object'
      ? Object.keys(rule.payload as Record<string, unknown>)
      : [];
  return (
    <section className="card" aria-label="Rule">
      <h2>{rule.kind}</h2>
      <p className="note">
        {rule.name}. No editor yet. Payload keys: {payload.join(', ') || 'none'}.
      </p>
    </section>
  );
}
