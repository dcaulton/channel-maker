import { PLANNED_KINDS, type Rule } from '@channel-maker/contracts';

export function RuleList({
  rules,
  selectedId,
  onSelect,
  onAdd,
}: {
  rules: Rule[];
  selectedId: string | null;
  onSelect: (rule: Rule) => void;
  onAdd: () => void;
}) {
  return (
    <section className="card" aria-label="Rules">
      <header className="pane-head">
        <h2>Rules</h2>
        <button type="button" onClick={onAdd}>Add rule</button>
      </header>
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
