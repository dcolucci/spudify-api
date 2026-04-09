## 4/9/26
Claude code output below following initial scaffolding:

Next steps to actually use it:
1. Copy .env.example → .env and fill in your Spotify app credentials (create one at developer.spotify.com)
2. Run bun run db:generate to generate the initial migration, then bun run db:migrate to apply it
3. Build out the Spotify OAuth flow (/auth/login → /auth/callback) — that's the natural next piece