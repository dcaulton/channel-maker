# Packing windowed sources

`windowed-sources` places titles into a civil-time window.

- **live / slate items** still occupy the whole window as one slot.
- **episodes items** walk the catalog in order using each asset's `durationSec`.

## overflow

- `slate` (default): if the next title would run past the window, do not start
  it. Remaining seconds become the fallback slate (`fallbackSlateTitle` or
  `item.slateTitle`, usually "No programming").
- `carry`: play until the window ends. Remember `index` + `offsetSec`. The next
  occurrence of this item resumes there.

## Cursor

Replay every matching window from `episodeOrigin` through yesterday. Do not
read `ScheduleSlot` rows. Engine slots are disposable output (`origin=engine`).

`startOffsetSec` on a planned slot is for the player (`#EXTVLCOPT:start-time=`).
It is not persisted as scheduler memory yet.
