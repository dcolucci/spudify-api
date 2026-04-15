# OAuth Flow

Covers the Spotify OAuth 2.0 authorization code flow implemented in `src/routes/auth.ts`.

## Sequence diagram

```mermaid
sequenceDiagram
    actor User
    participant API as Spudify API<br/>(Fastify)
    participant DB as SQLite DB
    participant Spotify as Spotify<br/>(accounts.spotify.com)
    participant SpotifyAPI as Spotify API<br/>(api.spotify.com)

    User->>API: GET /auth/login

    note over API: Generate random state token<br/>Store in memory with 10-min expiry

    API-->>User: 302 Redirect → Spotify authorize URL<br/>(client_id, scopes, redirect_uri, state)

    User->>Spotify: Follow redirect (user logs in & grants permissions)
    Spotify-->>User: 302 Redirect → /auth/callback?code=…&state=…

    User->>API: GET /auth/callback?code=…&state=…

    note over API: Validate state token<br/>(present, not expired) → delete it

    API->>Spotify: POST /api/token<br/>(code, redirect_uri, Basic auth)
    Spotify-->>API: { access_token, refresh_token, expires_in }

    API->>SpotifyAPI: GET /v1/me<br/>(Bearer access_token)
    SpotifyAPI-->>API: { id, email, display_name }

    note over API: Allowlist check<br/>ALLOWED_SPOTIFY_USER_IDS env var<br/>403 if not on list

    alt New user
        API->>DB: INSERT users (spotify_user_id, email, display_name)
        API->>DB: INSERT spotify_tokens (user_id, access_token, refresh_token, expires_at)
    else Returning user
        API->>DB: UPDATE spotify_tokens SET access_token, refresh_token, expires_at
    end

    API->>DB: INSERT sessions (user_id, token)
    API-->>User: 200 { token: <session_token> }
```

## Notes

- **CSRF protection** — the `state` parameter is a 32-hex-character random token stored in-memory (`pendingStates` map). It is validated and immediately deleted on callback. Tokens expire after 10 minutes. This is intentionally in-memory because the app runs as a single process.
- **Allowlist** — set `ALLOWED_SPOTIFY_USER_IDS` as a comma-separated list of Spotify user IDs to restrict who can complete the flow. Leave unset to allow any Spotify account.
- **Token storage** — one row per user in `spotify_tokens` (enforced by a `UNIQUE` constraint on `user_id`). Re-authentication overwrites the existing row rather than appending.
- **Session token** — a 64-hex-character random token inserted into `sessions`. Returned to the caller as a bearer token for subsequent API requests.
