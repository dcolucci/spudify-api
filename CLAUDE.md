# Claude Code — Project Guide

## Important

Keep `README.md` up to date. If you make any changes that affect the tech stack, prerequisites, environment variables, or commands, update `README.md` to reflect them before finishing your work.

## What this project is

A personal API that layers on top of Spotify. It lets the owner apply a custom tagging and organization system to their Spotify library, and surfaces convenience endpoints (top-played tracks, albums, playlists, etc.). It is invite-only — not a public product.

## Stack

| Layer | Choice |
|---|---|
| Runtime | Bun |
| Language | TypeScript |
| Framework | Fastify v5 |
| ORM | Drizzle ORM |
| Database | SQLite (bun:sqlite, WAL mode) |
| Spotify | @spotify/web-api-ts-sdk |
| Hosting | Railway (persistent volume for the SQLite file) |

See `DECISIONS.md` for the reasoning behind each choice.

## Key commands

```bash
bun run dev          # Start server with watch mode
bun run start        # Start server (production)
bun run db:generate  # Generate a new Drizzle migration from schema changes
bun run db:migrate   # Apply pending migrations
bun run db:studio    # Open Drizzle Studio (local DB browser)
```

## Project structure

```
src/
  index.ts           # App entry point — registers plugins and routes, starts server
  db/
    index.ts         # Opens the SQLite connection and exports `db` (Drizzle instance)
    migrate.ts       # Migration runner (called via db:migrate script)
    schema.ts        # Drizzle table definitions — single source of truth for the schema
  routes/
    *.ts             # One file per route group, exported as Fastify plugin functions
drizzle/             # Auto-generated migration files — commit these
drizzle.config.ts    # Drizzle Kit config (schema path, migrations output, DB path)
DECISIONS.md         # Architecture decision records
```

## Conventions

- **Routes** are Fastify plugin functions (`async function fooRoute(app: FastifyInstance)`), registered in `src/index.ts` via `app.register(...)`. Add new route files under `src/routes/` and register them in `src/index.ts`.
- **Schema changes** always go through Drizzle migrations: edit `src/db/schema.ts`, run `db:generate`, commit the generated migration file, run `db:migrate`. Never edit migration files by hand.
- **Environment variables** — all config comes from env vars. `.env.example` is the canonical list. Bun loads `.env` automatically; no `dotenv` import needed.
- **Database access** — import `db` from `src/db/index.ts` directly in route files. No repository layer abstraction at this stage.

## Environment variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `DATABASE_PATH` | Path to SQLite file (default: `data/spudify.db`) |
| `SPOTIFY_CLIENT_ID` | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | From Spotify Developer Dashboard |
| `SPOTIFY_REDIRECT_URI` | OAuth callback URL |

## Auth model

Spotify OAuth 2.0, one token set per user. Tokens (access + refresh) are stored in the `spotify_tokens` table. The app is invite-only — no open registration. Access control is allowlist-based.

## Database notes

- The `data/` directory (and SQLite file) is gitignored. On a fresh environment, run `db:migrate` first — it creates the directory automatically.
- WAL mode and `PRAGMA foreign_keys = ON` are set at connection time in `src/db/index.ts`.
- Drizzle migration files live in `drizzle/` and **should be committed**.
