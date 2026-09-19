# channel-maker

A NestJS app that runs a **virtual TV station**: channels, a persistent schedule, a media catalog, and M3U playlists that VLC / TVs play.

This process does **not** emit video bytes. Players pull URLs (TVHeadend live streams or HTTP files on the LAN NAS). Channel-maker only decides _what URL airs when_.

## What exists today

- CRUD for channels, schedule slots, media assets, works, rulesets
- `GET /channels/:id/now`, `/schedule?from&to`, `/playlist.m3u`
- OpenAPI at `/docs`
- Deterministic planners: `rotate-tv-streams`, `windowed-sources` (dayparts, episode pack, leftover slate, carry)
- NAS ingest job (walk + ffprobe + upsert + parse profile → Works)
- TVHeadend channel sync job (ticketless `/stream/channel/<uuid>`)
- BullMQ + Redis background queue + EventEmitter2
- Demo clocks: `broadcast-rotation` (OTA), `spooky-stories` (NAS anthologies)

Not built: admin UI, LLM-picked grids, generated bumpers, TVH DVR adapter.

Where the ideas come from (broadcast, libraries, clocks): [docs/FOUNDATIONS.md](docs/FOUNDATIONS.md).  
How the code is shaped: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).  
Day-to-day commands: [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Stack

- Node via **fnm**, package manager **pnpm**
- NestJS, strict TypeScript, ESLint, Prettier
- Prisma 7 + PostgreSQL 16 (Docker Compose)
- Prisma URL lives in `prisma.config.ts` (`env('DATABASE_URL')`), not in `schema.prisma`
- Runtime client: `@prisma/adapter-pg` + `pg` Pool
- Jest unit tests; e2e with Testcontainers Postgres **and** Redis
- Fedora: `TESTCONTAINERS_RYUK_DISABLED=true pnpm test:e2e`
- CI needs a dummy `DATABASE_URL` so Prisma 7 `env()` does not throw during `prisma generate`

## Mental model

```
filename / TVH grid
        → ingest or tvh-sync
        → Work  (what it is)  +  MediaAsset (URL you can play)
Ruleset + Rule.payload
        → planner (pure-ish pack)
        → ScheduleSlot rows  origin=engine
GET playlist.m3u / now / schedule
        → VLC
```

Three string worlds that must match **exactly**:

| World                                       | Example      |
| ------------------------------------------- | ------------ |
| Disk / parser / profile aliases             | `Archive 81` |
| `Work.seriesTitle` or live `Work.title`     | `Archive 81` |
| Rule payload `seriesTitle` / `streamTitles` | `Archive 81` |

`Archive 81` and `Archive 81 2022 -` are different catalogs. The planner does not fuzzy-match.

## Quick start

```bash
pnpm install
docker compose up -d db redis
cp .env.example .env
# DATABASE_URL=postgresql://channelmaker:channelmaker@127.0.0.1:5432/channelmaker?schema=public
pnpm prisma:generate
pnpm prisma:migrate
pnpm seed
pnpm start:dev
```

- App: http://localhost:3000
- Health: http://localhost:3000/health
- OpenAPI: http://localhost:3000/docs

```bash
pnpm test
TESTCONTAINERS_RYUK_DISABLED=true pnpm test:e2e:local
```

Compose user/password/db are `channelmaker`, not `postgres`. On Fedora, if Prisma prints `P1001` while `docker ps` shows `channel-maker-db` healthy, try `127.0.0.1` (not `localhost`) or reboot Docker; host → published `5432` can break without the container being down.

## Play something

Live rotation:

```bash
pnpm fill-schedule -- broadcast-rotation
# GET /channels/<id>/playlist.m3u  → VLC
```

NAS files need a **player URL**, not `/mnt/nas/...`. On the DXP4800, a LAN-only nginx on port **8088** serves the `Videos` share. Ingest with `publicBase`:

```bash
curl -s -X POST http://localhost:3000/jobs/ingest \
  -H 'Content-Type: application/json' \
  -d '{"root":"/mnt/nas/videos/Spooky-Stories","dryRun":false,"publicBase":"http://10.0.0.89:8088"}'

pnpm fill-schedule -- spooky-stories
```

Do not put UGOS `filemgr/share-download?id=` grants in `sourceUrl`. Do not port-forward 8088.

## Repo layout (the parts that matter)

```
prisma/schema.prisma          Channel, Work, MediaAsset, Ruleset, Rule, ScheduleSlot
prisma/seed.ts                demo channels + rules payloads
src/scheduler/                fillChannel + planners + packers
src/scheduler/planners/       Prisma in, slots out (one class per rule kind)
src/ingest/                   walk, ffprobe, parse-filename + profiles/
src/tvheadend/                grid client + upsert live Works
src/jobs/                     BullMQ processor (ingest, tvh-sync, …)
```

`fillChannel` only orchestrates. Packing lives in `windowed-sources.ts` / `rotate-tv-streams.ts` so it can be unit-tested without Nest.
