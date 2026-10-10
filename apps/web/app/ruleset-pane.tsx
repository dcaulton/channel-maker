import type { AssetHit, WindowedItem } from '@channel-maker/contracts';

function daysLabel(days: WindowedItem['days']): string {
  return days === 'daily' ? 'daily' : days.join(',');
}

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
  onDelete,
  onAddItem,
  onReorder,
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
  onDelete: (index: number) => void;
  onAddItem: (mode: WindowedItem['mode']) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const order = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.start.localeCompare(b.item.start) || a.index - b.index);
  const startCounts = new Map<string, number>();
  for (const item of items) startCounts.set(item.start, (startCounts.get(item.start) ?? 0) + 1);
  return (
    <section className="card" aria-label="Ruleset">
      <header className="pane-head">
        <h2>windowed sources designer{name ? `: ${name}` : ''}</h2>
        <label className="add">
          Add
          <select
            value=""
            onChange={(event) => {
              const value = event.target.value;
              if (value.startsWith('item:')) {
                onAddItem(value.slice(5) as WindowedItem['mode']);
              }
            }}
          >
            <option value="">choose</option>
            <option value="item:episodes">episodes</option>
            <option value="item:live">live</option>
            <option value="item:slate">slate</option>
          </select>
        </label>
      </header>
      {items.length === 0 ? <p className="note">No windowed-sources items.</p> : null}
      <ol className="log">
        {order.map(({ item, index }) => {
          const open = index === selectedIndex;
          const shown = open && draft ? draft : item;
          const clash = (startCounts.get(item.start) ?? 0) > 1;
          return (
            <li
              key={`${item.start}-${item.title}-${index}`}
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData('text/plain'));
                if (Number.isInteger(from) && from !== index) onReorder(from, index);
              }}
            >
              <div className={open ? 'slot selected' : clash ? 'slot clash' : 'slot'}>
                <button type="button" className="slot-main" onClick={() => onSelect(index)}>
                  <span className="when">
                    {shown.start}–{shown.end} · {shown.mode} · {daysLabel(shown.days)}
                  </span>
                  <strong>{shown.title}</strong>
                  <span>{shown.seriesTitle ?? shown.seriesTitles?.join(', ') ?? 'no series'}</span>
                  {clash ? (
                    <span className="tip">Same start time as another item. The planner may overlap these.</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    if (window.confirm(`Delete ${item.title}?`)) onDelete(index);
                  }}
                >
                  Delete
                </button>
              </div>
              {open && draft ? (
                <form
                  className="edit"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onSave();
                  }}
                >
                  <label>
                    Start
                    <input value={draft.start} onChange={(e) => onDraft({ ...draft, start: e.target.value })} />
                  </label>
                  <label>
                    End
                    <input value={draft.end} onChange={(e) => onDraft({ ...draft, end: e.target.value })} />
                  </label>
                  <label>
                    Days
                    <input
                      value={daysLabel(draft.days)}
                      onChange={(e) => {
                        const value = e.target.value.trim();
                        onDraft({
                          ...draft,
                          days: value === 'daily' ? 'daily' : value.split(',').map(Number).filter(Number.isFinite),
                        });
                      }}
                    />
                  </label>
                  <label>
                    Mode
                    <select
                      value={draft.mode}
                      onChange={(e) => onDraft({ ...draft, mode: e.target.value as WindowedItem['mode'] })}
                    >
                      <option value="episodes">episodes</option>
                      <option value="live">live</option>
                      <option value="slate">slate</option>
                    </select>
                  </label>
                  <label>
                    Title
                    <input value={draft.title} onChange={(e) => onDraft({ ...draft, title: e.target.value })} />
                  </label>
                  <label>
                    Series
                    <input
                      value={draft.seriesTitle ?? ''}
                      onChange={(e) => onDraft({ ...draft, seriesTitle: e.target.value })}
                    />
                  </label>
                  <label>
                    Series list
                    <input
                      value={draft.seriesTitles?.join(', ') ?? ''}
                      onChange={(e) =>
                        onDraft({
                          ...draft,
                          seriesTitles: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <label>
                    Overflow
                    <select
                      value={draft.overflow ?? ''}
                      onChange={(e) =>
                        onDraft({
                          ...draft,
                          overflow: e.target.value ? (e.target.value as 'slate' | 'carry') : undefined,
                        })
                      }
                    >
                      <option value="">none</option>
                      <option value="slate">slate</option>
                      <option value="carry">carry</option>
                    </select>
                  </label>
                  <label>
                    Slate title
                    <input
                      value={draft.slateTitle ?? ''}
                      onChange={(e) => onDraft({ ...draft, slateTitle: e.target.value })}
                    />
                  </label>
                  <label>
                    Find a title
                    <input placeholder="justice" onChange={(e) => onSearch(e.target.value)} />
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
                    <button type="button" onClick={onGenerate}>Generate log</button>
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}
      </ol>
      {message ? <p className="note">{message}</p> : null}
    </section>
  );
}
