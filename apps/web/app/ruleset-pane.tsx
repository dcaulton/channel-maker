import type { AssetHit, WindowedItem } from '@channel-maker/contracts';

export function RulesetPane({
  name,
  items,
  selectedIndex,
  draft,
  hits,
  message,
  onSelect,
  onDraft,
  onSearch,
  onPick,
  onSave,
  onGenerate,
}: {
  name: string | null;
  items: WindowedItem[];
  selectedIndex: number | null;
  draft: WindowedItem | null;
  hits: AssetHit[];
  message: string | null;
  onSelect: (index: number) => void;
  onDraft: (item: WindowedItem) => void;
  onSearch: (q: string) => void;
  onPick: (hit: AssetHit) => void;
  onSave: () => void;
  onGenerate: () => void;
}) {
  return (
    <section className="card" aria-label="Ruleset">
      <h2>Ruleset{name ? ` · ${name}` : ''}</h2>
      {items.length === 0 ? <p className="note">No windowed-sources items.</p> : null}
      <ol className="log">
        {items.map((item, index) => (
          <li key={`${item.start}-${item.title}-${index}`}>
            <button
              type="button"
              className={index === selectedIndex ? 'slot selected' : 'slot'}
              onClick={() => onSelect(index)}
            >
              <span className="when">
                {item.start}–{item.end} · {item.mode}
              </span>
              <strong>{item.title}</strong>
              <span>{item.seriesTitle ?? 'no series'}</span>
            </button>
          </li>
        ))}
      </ol>
      {draft ? (
        <form
          className="edit"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <label>
            Start
            <input
              value={draft.start}
              onChange={(event) => onDraft({ ...draft, start: event.target.value })}
            />
          </label>
          <label>
            End
            <input
              value={draft.end}
              onChange={(event) => onDraft({ ...draft, end: event.target.value })}
            />
          </label>
          <label>
            Mode
            <select
              value={draft.mode}
              onChange={(event) =>
                onDraft({ ...draft, mode: event.target.value as WindowedItem['mode'] })
              }
            >
              <option value="episodes">episodes</option>
              <option value="live">live</option>
              <option value="slate">slate</option>
            </select>
          </label>
          <label>
            Title
            <input
              value={draft.title}
              onChange={(event) => onDraft({ ...draft, title: event.target.value })}
            />
          </label>
          <label>
            Series
            <input
              value={draft.seriesTitle ?? ''}
              onChange={(event) => onDraft({ ...draft, seriesTitle: event.target.value })}
            />
          </label>
          <label>
            Find a title
            <input
              placeholder="justice"
              onChange={(event) => onSearch(event.target.value)}
            />
          </label>
          <ul className="hits">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button type="button" onClick={() => onPick(hit)}>
                  {hit.work?.seriesTitle ?? hit.title}
                </button>
              </li>
            ))}
          </ul>
          <div className="actions">
            <button type="submit">Save item</button>
            <button type="button" onClick={onGenerate}>
              Generate log
            </button>
          </div>
        </form>
      ) : null}
      {message ? <p className="note">{message}</p> : null}
    </section>
  );
}
