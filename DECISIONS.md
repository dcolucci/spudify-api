# Architecture Decision Records

Decisions are listed roughly in chronological order. Each entry captures the context at the time the decision was made.

---

## 001 — Use Bun as the runtime

**Status:** Accepted

**Context:** The project is in the Node.js ecosystem. The default choice would be Node.js with a TypeScript transpiler (ts-node or tsx). Bun is a newer runtime that runs TypeScript natively, includes a built-in SQLite driver, a test runner, and a package manager — reducing toolchain complexity.

**Decision:** Use Bun as the runtime instead of Node.js.

**Trade-offs:**
- Bun's ecosystem compatibility is very high but not 100% — some packages behave differently or require workarounds.
- If a compatibility issue arises, the fallback is to migrate to Node.js + tsx, which is straightforward since the application code doesn't need to change.

---

## 002 — Use Fastify as the HTTP framework

**Status:** Accepted

**Context:** Express is the most familiar Node.js framework but is showing its age — no built-in TypeScript support, no schema validation, slower request throughput. Hono is a modern alternative with excellent edge/serverless support. Fastify is a mature, high-performance framework with first-class TypeScript support and built-in JSON schema validation.

**Decision:** Use Fastify v5.

**Trade-offs:**
- Fastify's plugin system has a learning curve compared to Express middleware.
- Hono would be slightly lighter and more edge-friendly, but Fastify's ecosystem (auth plugins, sensible error handling, etc.) is richer and more appropriate for a traditional server deployment.

---

## 003 — Use SQLite as the database

**Status:** Accepted

**Context:** This is a personal, low-traffic application. A managed database (PostgreSQL on Supabase, Neon, etc.) adds operational overhead and cost for no meaningful benefit at this scale. SQLite is a file-based database that runs in-process — no network round-trips, no connection pooling, trivially simple to back up.

**Decision:** Use SQLite via Bun's built-in `bun:sqlite` driver.

**Trade-offs:**
- SQLite is not suitable for high-concurrency write workloads. This is a non-issue for a personal app.
- WAL mode is enabled, which improves read concurrency.
- If the app ever needs to scale beyond a single process, Turso (hosted libSQL, SQLite-compatible) is a natural migration path with minimal code changes.

---

## 004 — Use Drizzle ORM

**Status:** Accepted

**Context:** Prisma is the most popular ORM in the TypeScript ecosystem but is heavyweight — it requires a separate codegen step, spawns a query engine process, and adds significant bundle size. For a small project with a simple schema, this overhead is not justified.

**Decision:** Use Drizzle ORM.

**Trade-offs:**
- Drizzle is TypeScript-first, schema-as-code, and has no codegen step.
- Its query API closely mirrors SQL, which makes it easy to reason about what queries are being issued.
- It is less mature than Prisma and has a smaller community, but is stable enough for this use case.

---

## 005 — Host on Railway instead of Vercel

**Status:** Accepted

**Context:** The developer already uses Vercel for other projects. However, Vercel's serverless execution model is incompatible with this stack: it does not provide a persistent filesystem (ruling out SQLite), and serverless cold-start behavior is a poor fit for a traditional API server. Fly.io is a strong alternative with an excellent SQLite story (LiteFS), but has a steeper CLI-based workflow.

**Decision:** Host on Railway.

**Trade-offs:**
- Railway provides persistent volumes, supports any Docker/Bun/Node app, and has a deployment workflow similar to Vercel (GitHub-connected, automatic deploys).
- Railway is slightly less "zero-config" than Vercel for frontend apps, but is the better fit for a persistent API server.
- Fly.io remains a viable alternative if Railway proves limiting.

---

## 006 — API acts as a non-hydrating join layer between the client and Spotify

**Status:** Accepted

**Context:** The app's purpose is to let users apply custom tagging and categorization to their Spotify library. An early design question was whether this API should fetch Spotify metadata (track names, artwork, audio features, etc.) and return enriched responses to the client, or return only owned data (category and URI relationships) and leave the client to fetch Spotify metadata directly. Spotify's developer terms also restrict persistent storage of their content data, which limits how aggressively a server-side caching approach could be applied.

**Decision:** This API owns category models and their relationships to Spotify URIs only. It does not fetch, hydrate, or cache Spotify content data. Routes return Spotify URIs as opaque identifiers; the client is responsible for calling Spotify's API directly to obtain display metadata (names, artwork, etc.) and merging it locally before rendering.

**Trade-offs:**
- The client must maintain a Spotify access token and call Spotify's API independently, adding complexity to the client layer.
- Spotify's batch endpoints (`/v1/tracks?ids=…`, etc.) make this efficient — a full category can typically be hydrated in one or two requests.
- The API surface and database schema stay narrow and stable, independent of Spotify's response shape.
- This approach is the most straightforward path to compliance with Spotify's developer terms around content data storage.
- If query requirements ever grow to include filtering or sorting by Spotify-owned attributes (e.g. BPM, genre), this decision should be revisited.

---

## 007 — Use Spotify OAuth as the API authentication mechanism

**Status:** Accepted

**Context:** The app is invite-only and its entire purpose is Spotify-related — there is no meaningful use of the app without a Spotify account. A separate, independent authentication system (username/password, magic link, etc.) would add implementation overhead with no functional benefit, since Spotify identity verification already gates access.

**Decision:** Authenticating with Spotify via OAuth 2.0 is the sole path to obtaining an API session token. At the end of the OAuth callback, the server issues a session token (stored in the `sessions` table) which the client uses as a bearer token for subsequent API requests. Access is further restricted by an allowlist of Spotify user IDs (`ALLOWED_SPOTIFY_USER_IDS`).

**Trade-offs:**
- The API has no authentication mechanism independent of Spotify — if Spotify's OAuth is unavailable, no new sessions can be created.
- This is an acceptable risk given the app's personal, invite-only nature and its inherent dependency on Spotify.
- If the app ever needed to support non-Spotify-linked users or multiple identity providers, a dedicated auth layer would need to be introduced.
