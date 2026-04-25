## 4/25/26 001
Did:
```
Here's a summary of what was built:

  ---
  Schema (src/db/schema.ts) — Added a categories table with id, userId (FK → users), name, createdAt, and a unique constraint on (userId, name) to prevent duplicate category names per
  user. Migration generated and applied.

  Auth middleware (src/lib/authenticate.ts) — A reusable Fastify preHandler function that:
  - Validates the Authorization: Bearer <token> header
  - Looks up the token in the sessions table
  - Returns 401 if missing or invalid
  - Attaches request.userId for use in route handlers

  POST /categories (src/routes/categories.ts) — Protected by authenticate. Validates that name is a non-empty string, checks for a duplicate category name for that user (returning 409 if
  found), inserts the row, and responds 201 { id, name }.

  src/index.ts — Added declare module 'fastify' augmentation for request.userId, app.decorateRequest('userId', 0), and registered categoriesRoutes.
  ```

Next steps:
 * Need to add some documentation or something to help agents find the `bun` executable

## 4/24/26 001
Did:
 * Considered architecture decision around whether the API should hydrate Spotify data before returning data to users (e.g., track & artist names), or should only return Spotify URIs and leave it to clients to hydrate (see decision 006)
 * Added proposed flow diagrams for categorization CRUD flows

Next steps:
 * need to build session token validation into protected routes
 * build out categorization CRUD flows
 * look into `Spotify App Remote SDK` for allowing a native app to "remote control" the Spotify app and play music

## 4/14/26 001
Did:
 * Added Mermaid sequence diagram for auth flow
 * Built out Spotify token refresh utility

Next steps:
 * build out a basic Spotify API interaction (e.g. fetch user's library)
 * Later: separation of responsibilities of Spotify user auth between API and Client apps)

## 4/11/26 001
Next steps:
 * gain firmer understanding of Spotify auth logic
 * add token refresh utility
 * figure out desired user flow

## 4/9/26 002
```
claude --resume 194ecf49-7347-4d90-a658-1151b5922826
```

## 4/9/26 001
Claude code output below following initial scaffolding:

Next steps to actually use it:
1. Copy .env.example → .env and fill in your Spotify app credentials (create one at developer.spotify.com)
2. Run bun run db:generate to generate the initial migration, then bun run db:migrate to apply it
3. Build out the Spotify OAuth flow (/auth/login → /auth/callback) — that's the natural next piece