# Architecture

## Why this shape

Broadcast scheduling, traffic systems, and radio clocks all separate:

- **Catalog** (what can air)
- **Clock / rules** (how to pick)
- **Log** (what did air / will air)
- **Playout** (who reads the log)

Channel-maker copies that. If you put filenames in the planner, or TVH tickets in the catalog, refill and players both get fragile.

## Catalog

### Work

A program or service: live channel, episode, movie, or slate.

Important fields:

- `kind`: `live` | `episode` | `movie` | `slate`
- `title`
- `seriesTitle`, `season`, `episode` for episodes
- `year` for movies
- `externalIds` JSON (e.g. TVH uuid)

The planner keys episode catalogs on **`seriesTitle`**. Live and slate catalogs key on **`title`**.

### MediaAsset

One playable essence:

- `sourceUrl` (unique) — what VLC opens
- `sourceType` — `http-live` | `file` | …
- `durationSec` — required for file packing; live is endless
- `description` — often the NAS filesystem path (used to re-key URL after publicBase)
- `workId` — nullable until ingest is sure

A live TVH row is _one pipe_ (MeTV). Programs on that pipe are EPG events, not extra `workId`s on the same asset. File rows are 1:1 with a Work when parse confidence is high.

## Clock

### Channel

Named lineup (`spooky-stories`, `broadcast-rotation`). Slug is what `pnpm fill-schedule -- <slug>` uses.

### Ruleset + Rule

A ruleset is an ordered list of rules plus `applyMode` (today: sequential).  
A rule is `kind` + JSON `payload`.

| kind                | Payload idea                           | Planner file                                                     |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `rotate-tv-streams` | `streamTitles[]`, `slotDurationSec`    | `planners/rotate-tv-streams.planner.ts` + `rotate-tv-streams.ts` |
| `windowed-sources`  | `timeZone`, `episodeOrigin`, `items[]` | `planners/windowed-sources.planner.ts` + `windowed-sources.ts`   |

`fillChannel`:

1. Resolve channel + active binding
2. Dispatch each enabled rule to the planner registered for `kind`
3. Replace `ScheduleSlot` rows with `origin=engine` (manual rows stay)

Planners **load catalog from Prisma**, then call a **pure pack function**. Tests hit the pack function with fake catalogs.

### windowed-sources items

```text
start, end     local HH:MM (24:00 = next midnight)
days           "daily" | [0-6]  (JS weekday, 0 = Sunday)
mode           live | episodes | slate | (movies, if enabled)
title          label / live or slate Work.title
seriesTitle    one series key
seriesTitles   several series concatenated into one wheel
overflow       slate | carry
slateTitle     leftover bumper (else payload.fallbackSlateTitle else "No programming")
```

Episode packing uses `durationSec`. If the next file is longer than time left:

- `slate` — play the slate Work for the remainder
- `carry` — start the file now, resume `startOffsetSec` next window

`episodeOrigin` + replay of every prior civil day makes the cursor deterministic. **Replay must receive the same slate as today** or leftover packing throws `Need a slate titled "No programming"`.

`resolveSlate` must load leftover names (`fallbackSlateTitle`, `"No programming"`), not only `mode: slate` items.

## Jobs

Queue name `background` (BullMQ + Redis). HTTP `201` means **queued**, not finished. Watch `start:dev` for the worker.

| Job             | Role                                                       |
| --------------- | ---------------------------------------------------------- |
| `ingest`        | Walk `root`, probe duration, upsert asset, parse+link Work |
| `tvh-sync`      | `/api/channel/grid` → live Works + ticketless stream URLs  |
| `llm-stub`      | Placeholder                                                |
| `fill-schedule` | Optional; CLI `pnpm fill-schedule` is the same call        |

Parse **syntax** lives in `src/ingest/parse-filename.ts`.  
**Names** live in `src/ingest/profiles/spooky-stories.ts` (`aliases`, `junk`, `skipIf`).

## Playout

- `GET /channels/:id/now` — slot containing now
- `GET /channels/:id/schedule?from&to`
- `GET /channels/:id/playlist.m3u`

M3U is the log serialized. A bad `sourceUrl` is a player problem (encoding, auth, LAN), not a planner problem.

## What we learned the hard way

1. **Exact strings.** Profile aliases + strip year/`720p` _before_ alias. Clock JSON uses the alias _values_.
2. **Assets without Works are invisible to fill.**
3. **UGOS share links are grants**, not path URLs. LAN nginx (or WebDAV GET) is the file protocol.
4. **TVH `?ticket=` expires (~5 min).** Store `/stream/channel/<uuid>` and a streaming access entry on the LAN.
5. **P1001 ≠ empty database.** Fedora published ports vs Prisma; compose role is `channelmaker`.
6. **e2e Postgres is Testcontainers**, role `postgres`, random port. Not `channel-maker-db`.
7. **Leftover slate in replay** is part of the algorithm, not an edge case.
