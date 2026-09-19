# Operations

## Environment

`.env` (never commit secrets):

```bash
DATABASE_URL="postgresql://channelmaker:channelmaker@127.0.0.1:5432/channelmaker?schema=public"
REDIS_URL="redis://127.0.0.1:6379"
TVH_URL="http://10.0.0.172:9981"
TVH_USER="channelmaker"
TVH_PASS=""
TVH_STREAM_BASE="http://10.0.0.172:9981"
NAS_INGEST_ROOT="/mnt/nas/videos"
NAS_PUBLIC_BASE="http://10.0.0.89:8088"
SLATE_SOURCE_URL="http://10.0.0.89:8088/slates/no-programming.mp4"
OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318"
```

Prisma 7 reads `DATABASE_URL` from `prisma.config.ts`. Prefer `127.0.0.1` over `localhost` on Fedora.

## Database

```bash
docker compose up -d db redis
pnpm exec prisma migrate status
pnpm exec prisma migrate deploy
pnpm seed
```

Compose creates role **`channelmaker`**, not `postgres`. `pg_isready -U postgres` will lie.

Wipe local data only when you mean it:

```bash
docker compose stop db
docker compose rm -f db
docker volume ls | grep -i postgres
docker volume rm <that_volume>
docker compose up -d db
pnpm exec prisma migrate deploy
pnpm seed
```

e2e: `TESTCONTAINERS_RYUK_DISABLED=true pnpm test:e2e:local`  
Uses its own Postgres + Redis. Failures there are not `channel-maker-db`.

## Fill a channel

```bash
pnpm fill-schedule -- broadcast-rotation
pnpm fill-schedule -- spooky-stories
pnpm fill-schedule -- --dry-run spooky-stories
```

```bash
ID=$(curl -s http://localhost:3000/channels | jq -r '.[] | select(.slug=="spooky-stories") | .id')
curl -s "http://localhost:3000/channels/$ID/now"
curl -s "http://localhost:3000/channels/$ID/playlist.m3u" | head
```

Need a slate Work+asset titled exactly `No programming` or leftover packing throws.

## Ingest NAS files

Mount on jamesbrown (`/mnt/nas/videos`). Players use nginx `http://10.0.0.89:8088/...` (LAN only).

```bash
# names only
curl -s -X POST http://localhost:3000/jobs/ingest \
  -H 'Content-Type: application/json' \
  -d '{"root":"/mnt/nas/videos/Spooky-Stories","dryRun":true,"publicBase":"http://10.0.0.89:8088"}'

# write + link Works
curl -s -X POST http://localhost:3000/jobs/ingest \
  -H 'Content-Type: application/json' \
  -d '{"root":"/mnt/nas/videos/Spooky-Stories","dryRun":false,"publicBase":"http://10.0.0.89:8088"}'

curl -s http://localhost:3000/works | jq '[.[] | select(.kind=="episode") | .seriesTitle] | unique'
```

Watch **start:dev**, not just the `201`. `sourceUrl` should be HTTP; `workId` set for parsed episodes.

Spaces in paths: encode each segment (`encodeURIComponent`) in `toSourceUrl` or some TVs fail.

## TVHeadend

```bash
curl -s -X POST http://localhost:3000/jobs/tvh-sync \
  -H 'Content-Type: application/json' \
  -d '{"dryRun":false}'
```

Store ticketless `/stream/channel/<uuid>`. LAN access entry for streaming without prompting VLC. API user needs **Web interface** (the `*` streaming-only row will 403 `/api/channel/grid`).

## Ugreen file HTTP (DXP4800)

Docker project `media-http`: nginx:alpine, port **8088**, volume `/volume1/Videos` **`:ro`**, `Accept-Ranges`.  
Do not forward 8088. Do not use File Manager share-download ids.

If nginx logs `Permission denied` on `stat`, the worker user cannot read the share (`user nginx` in main config). World-read on that folder or run workers as root on this LAN box only.

## Observability

Optional: `docker compose up -d lgtm` — Grafana on **3001**, OTLP **4318**.  
App listens on **3000**; do not bind Grafana to 3000.

## Common errors

| Symptom                                | Layer                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `No episode catalog for "X"`           | Rule `seriesTitle` ≠ `Work.seriesTitle` or no Works                      |
| `Need a slate titled "No programming"` | Missing slate Work+asset, or replayCursor packed with `slate: undefined` |
| `P1001` localhost:5432                 | Host cannot reach published Postgres                                     |
| `role "postgres" does not exist`       | Talking to compose DB as the wrong user                                  |
| Job `201`, no worker logs              | Processor / Redis / env not in the Nest process                          |
| VLC auth on TVH                        | Access entry, not channel-maker                                          |
| VLC fails NAS URL                      | Mount path in DB, unencoded spaces, or 8088 not on LAN                   |
