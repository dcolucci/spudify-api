# spudify-api

A personal API that sits on top of Spotify. Applies a custom tagging and organization system to a Spotify library, and surfaces convenience endpoints for top-played tracks, albums, and playlists.

Invite-only — not a public product.

## Stack

- **Runtime:** [Bun](https://bun.sh)
- **Framework:** [Fastify v5](https://fastify.dev)
- **Database:** SQLite via `bun:sqlite`
- **ORM:** [Drizzle](https://orm.drizzle.team)
- **Spotify:** [@spotify/web-api-ts-sdk](https://github.com/spotify/spotify-web-api-ts-sdk)
- **Hosting:** [Railway](https://railway.com)

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- A [Spotify Developer app](https://developer.spotify.com/dashboard) with a client ID and secret

## Running locally

**1. Install dependencies**

```bash
bun install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Fill in `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` from your Spotify Developer Dashboard. Set `SPOTIFY_REDIRECT_URI` to `http://localhost:3000/auth/callback`.

**3. Run database migrations**

```bash
bun run db:migrate
```

This creates the SQLite database file at `data/spudify.db` (gitignored).

**4. Start the server**

```bash
bun run dev   # watch mode
bun run start # production mode
```

Server runs on `http://localhost:3000` by default. Check `GET /health` to verify.

## Database

Schema is defined in `src/db/schema.ts`. After making schema changes:

```bash
bun run db:generate  # generate a new migration file
bun run db:migrate   # apply it
```

Migration files live in `drizzle/` and are committed to the repo. Never edit them by hand.

To seed the database with a test user, session token, and sample categories:

```bash
bun run db:seed
```

This is idempotent — safe to re-run. The session token printed to the console (`test_session_token`) can be used as a `Bearer` token when testing authenticated routes locally.

To browse the database locally:

```bash
bun run db:studio
```

## Docs

System flow and sequence diagrams live in [`docs/`](docs/):

- [`docs/oauth-flow.md`](docs/oauth-flow.md) — Spotify OAuth 2.0 authorization code flow

## Tests

Bun has a built-in test runner. Tests are not yet written — when added, they will live alongside source files as `*.test.ts` and can be run with:

```bash
bun test
```
