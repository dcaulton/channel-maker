# channel-maker

A virtual television station engine.

This NestJS application builds and maintains continuous, rule-driven playlists/channels. It combines:

- Deterministic scheduling rules
- LLM-assisted curation (via Ollama)
- On-demand media from a NAS
- Live sources (IPTV / TVHeadend)

The system maintains an inspectable multi-day schedule and exposes it as consumable streams (M3U, etc.) for VLC, Smart TVs, and other players.

## Current status

Early skeleton. Basic NestJS app with health endpoint.

## Development

```bash
# Install dependencies
pnpm install

# Run in watch mode
pnpm start:dev

App: http://localhost:3000
Health: http://localhost:3000/health

Tech stack

NestJS + TypeScript (strict)
pnpm
Node.js (managed with fnm)

### 3. Test it

With the server running (`pnpm start:dev`):

- http://localhost:3000 → should still show the original Hello World (or whatever you changed earlier)
- http://localhost:3000/health → should return the JSON health response

### 4. Commit

Once both are working:

```bash
git add .
git commit -m "chore: initial NestJS skeleton with health endpoint and project README"
