import { PLANNED_KINDS, type Rule } from '@channel-maker/contracts';

export function RuleList({
  rules,
  selectedId,
  onSelect,
}: {
  rules: Rule[];
  selectedId: string | null;
  onSelect: (rule: Rule) => void;
}) {
  return (
    <section className="card" aria-label="Rules">
      <h2>Rules</h2>
      {rules.length === 0 ? <p className="note">No rules on this channel.</p> : null}
      <ul className="channel-list">
        {rules.map((rule) => {
          const planned = (PLANNED_KINDS as readonly string[]).includes(rule.kind);
          return (
            <li key={rule.id}>
              <button
                type="button"
                className={rule.id === selectedId ? 'channel selected' : 'channel'}
                onClick={() => onSelect(rule)}
              >
                <strong>{rule.name}</strong>
                <span>
                  {rule.kind}
                  {planned ? '' : ' · no planner'}
                  {rule.enabled ? '' : ' · off'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
