# Foundations

Channel-maker is a small program. The splits inside it are not. They show up in over-the-air television, radio continuity, library catalogs, and traffic systems that have been running for decades. This note is the “why,” not the file map ([ARCHITECTURE.md](./ARCHITECTURE.md) is the file map).

## Four objects

Call them **Catalog**, **Clock**, **Log**, and **Playout**. If two of these collapse into one table, the next feature costs a rewrite.

### Catalog

What _exists_ and can air: a series, an episode, a feature, a live service, a bumper.

Libraries already split this. FRBR-style thinking (and every decent ILS) distinguishes:

| Library-ish idea                                        | Here         |
| ------------------------------------------------------- | ------------ |
| Work / expression — “Creepshow the series, S01E03”      | `Work`       |
| Manifestation / item — _this_ file, _this_ muxed stream | `MediaAsset` |

The catalog answers “do we _have_ Tales from the Crypt S05E08?” It does not answer “what is on at 7pm.” Filenames, NFO sidecars, TVHeadend channel grids, and later EPG events are **ingest** into the catalog. They are not the schedule.

A live OTA service (WLS-HD, MeTV) is also catalog: one Work `kind=live` and one asset whose URL is an endless pipe. Programs _on_ that pipe are events in a guide, not extra files. Mixing “MeTV the channel” with “The Twilight Zone at 3am on MeTV” in one row is how linear and on-demand models fight.

### Clock

Rules for _how_ time is filled: rotate three live services every two hours; weekdays 14:00–16:00 pack Creepshow episodes in order; leftover minutes get a station card.

Broadcast networks and local stations have run this as **program logs**, **format clocks**, and **traffic**. Radio has an hour clock (news at :00, stopset at :15). Linear TV has dayparts (early morning, prime, late fringe) and **stripping** (the same series in the same slot every weekday).

The clock is deterministic until you deliberately add an interpreter (a human override, or later an LLM suggestion). Determinism is not a limitation; it is how you **refill** next week and get the same wheel position. `episodeOrigin` + replaying every prior window is the same idea as “episode 47 airs this Thursday because 46 aired last Thursday,” not because a row in the log says so.

The clock must not embed raw paths or tickets. It names catalog keys (`seriesTitle`, live `title`). Those keys are controlled vocabulary — library science again, not regex in the packer.

### Log

What _will air_ or _did air_ in a window: `ScheduleSlot` rows with start, end, title, `mediaAssetId`, `origin=engine`.

A station program log is not the format clock. The clock can be regenerated. The log is what master control and the lawyer look at (“what played at 8:02?”). That is why engine slots are tagged and replaceable, and why a manual override should be a different `origin`. Refill deletes engine rows and writes them again. It should not invent catalog.

As-run logs in real plants are even more specific (what _actually_ left the router). We do not have a router yet. The M3U is a forecast log, not as-run.

### Playout

Who reads the log and pulls bytes: VLC, a TV, later a real encoder.

Playout systems (automation, a cart machine, a video server) are supposed to be dumb: take the next event, cue the URL or tape. Channel-maker’s `/playlist.m3u` and `/now` are that interface. If VLC fails, the bug is usually the **URL** (auth, ticket, spaces, LAN), not the packer.

This is also why TVs never run sidecars or VPN clients. Playout is a client of HTTP. Policy (VPN, credentials) belongs in how `sourceUrl` is composed, or in a proxy, not in the player.

## Where the ideas were borrowed

**Over-the-air / linear TV.** Dayparts, stripping, rotation of movies vs episodic series, slates and IDs when the clock has a hole, live sports/news as _services_ that occupy a slot. Traffic (“sold units”) vs programming (“editorial units”) is a split we have not needed yet; when ads or house bumpers become first-class, they are catalog items the clock can point at, not a second scheduler.

**Radio continuity.** The hour clock; filler that is allowed to be short; “never start a 12-minute song at :57.” That last sentence _is_ `overflow: slate`. Carry-over (“finish the song after the break”) is `overflow: carry`.

**Library / bibliographic control.** Work vs item; controlled headings (`Tales from the Crypt` not `tftc.704.proper`); ingest profiles as local cataloging rules; “do not invent a heading from a dirty filename.” NFO/sidecar enrichment is copy cataloging. LLM synopsis is subject analysis, and it should run _after_ the heading exists.

**Automation / traffic software.** Rulesets as a poor person’s format clock; jobs as ingest and as-run-adjacent work; a queue so HTTP is not a two-hour `ffprobe`. Idempotent upsert by path or stream UUID is how you re-scan a shelf without duplicating headings.

**Deterministic simulation.** Replaying from an origin date so the cursor is a function of (catalog, clock, origin), not of “whatever was in the DB on Tuesday.” Same reason games and music sequencers have a timeline independent of the last take.

## Why the seams hurt when they blur

We already hit the textbook failures:

- Parser leftover (`Archive 81 2022 -`) vs clock heading (`Archive 81`) — two vocabularies, one dictionary lookup.
- Assets ingested, Works not created — catalog items without headings; the clock cannot see them.
- UGOS share-grant IDs in the asset — a loan-desk ticket stored as if it were a call number.
- TVH `?ticket=` in the URL — a session token stored as if it were the service.
- Leftover slate loaded for _today_ but not for _replay_ — the clock’s history was a different program than its present.

Fuzzy match in the packer would feel kind and would make the log lie. Forgiveness belongs in **ingest and the profile** (cataloging), not in **planItem** (the clock).

## What we are not borrowing yet

**Graph databases.** Useful when you care about “every actor who was in an episode that aired adjacent to a 1970s movie with bicycles.” Multi-hop recommendation. Until queries look like that, Postgres + JSONB is the catalog.

**LLM as the clock.** Useful as a _proposed_ ruleset or as bumper copy. If the model picks the next file every tick, you cannot refill and you cannot explain the log. Same reason a traffic system does not let the promo writer rewrite the program log in place.

**As-run and rights.** Real plants track what left air and what you are allowed to air. We still trust the player and the folder.

## How to read the code with this lens

| Question                            | Look at                                                    |
| ----------------------------------- | ---------------------------------------------------------- |
| What is this episode?               | `Work`                                                     |
| What URL do we play?                | `MediaAsset`                                               |
| What is the format of this channel? | `Ruleset` / `Rule.payload`                                 |
| What airs Thursday 22:10?           | `ScheduleSlot`                                             |
| How did we decide that?             | planner + packer (`windowed-sources`, `rotate-tv-streams`) |
| How did the file become a Work?     | ingest + parse **profile**                                 |
| What does the TV see?               | M3U / `/now`                                               |

When something breaks, name the layer first. “Postgres is down” and “the heading does not match the clock” are not the same ticket.
