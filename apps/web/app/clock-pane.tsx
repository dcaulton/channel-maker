import type { ScheduleSlot } from '@channel-maker/contracts';
import { chicagoTime } from './chicago-day';

export function ClockPane({
  label,
  slots,
  loading,
  error,
  selectedSlotId,
  onSelect,
}: {
  label: string;
  slots: ScheduleSlot[];
  loading: boolean;
  error: string | null;
  selectedSlotId: string | null;
  onSelect: (slot: ScheduleSlot) => void;
}) {
  return (
    <section className="card" aria-label="Log">
      <h2>Log · {label}</h2>
      {loading ? <p className="note">Loading today's log…</p> : null}
      {error ? <p className="note">{error}</p> : null}
      {!loading && !error && slots.length === 0 ? (
        <p className="note">No slots in today's window.</p>
      ) : null}
      <ol className="log">
        {slots.map((slot) => {
          const playable = Boolean(slot.mediaAsset?.sourceUrl);
          return (
            <li key={slot.id}>
              <button
                type="button"
                className={slot.id === selectedSlotId ? 'slot selected' : 'slot'}
                onClick={() => onSelect(slot)}
              >
                <span className="when">
                  {chicagoTime(slot.startsAt)}–{chicagoTime(slot.endsAt)}
                </span>
                <strong>{slot.title}</strong>
                <span>
                  {playable
                    ? slot.mediaAsset?.sourceUrl
                    : 'No work yet. The title is still undecided.'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
