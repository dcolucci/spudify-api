# Categorization Flow (Proposed)

Covers the core data flow for tagging Spotify entities with user-defined categories and retrieving enriched results. This API owns category data and URI relationships only — Spotify metadata hydration is delegated to the client.

## 1. Manage categories

```mermaid
sequenceDiagram
    actor User
    participant Client as Client App
    participant API as Spudify API<br/>(Fastify)
    participant DB as SQLite DB

    note over Client,DB: Session token obtained via OAuth flow — see docs/oauth-flow.md

    User->>Client: Create category "Jazz"
    Client->>API: POST /categories<br/>{ name: "Jazz" }<br/>Bearer: session_token
    API->>DB: INSERT categories (user_id, name)
    DB-->>API: { id, name }
    API-->>Client: 201 { id, name }
    Client-->>User: Category created
```

## 2. Tag a Spotify entity

```mermaid
sequenceDiagram
    actor User
    participant Client as Client App
    participant API as Spudify API<br/>(Fastify)
    participant DB as SQLite DB

    User->>Client: Assign "Jazz" to a track / album / artist
    Client->>API: POST /tags<br/>{ spotify_uri: "spotify:track:…", category_id }<br/>Bearer: session_token
    API->>DB: INSERT tags (user_id, category_id, spotify_uri)
    DB-->>API: OK
    API-->>Client: 201 Created
    Client-->>User: Tag applied
```

## 3. Browse a category

```mermaid
sequenceDiagram
    actor User
    participant Client as Client App
    participant API as Spudify API<br/>(Fastify)
    participant DB as SQLite DB
    participant SpotifyAPI as Spotify API<br/>(api.spotify.com)

    User->>Client: Open category "Jazz"
    Client->>API: GET /categories/:id/items<br/>Bearer: session_token
    API->>DB: SELECT spotify_uri FROM tags<br/>WHERE category_id = ? AND user_id = ?
    DB-->>API: ["spotify:track:abc", "spotify:track:def", …]
    API-->>Client: 200 { category, spotify_uris: […] }

    note over Client: Client hydrates Spotify metadata directly —<br/>this API never fetches or stores Spotify content data
    Client->>SpotifyAPI: GET /v1/tracks?ids=…<br/>Bearer: spotify_access_token
    SpotifyAPI-->>Client: [{ name, artists, album, artwork_url, … }]

    note over Client: Merge owned category data with Spotify metadata locally
    Client-->>User: Render enriched list
```

## 4. Playback

```mermaid
sequenceDiagram
    actor User
    participant Client as Client App
    participant SpotifyAPI as Spotify API<br/>(api.spotify.com)

    alt Embedded Spotify player (Web Playback SDK)
        User->>Client: Play track
        Client->>SpotifyAPI: PUT /v1/me/player/play<br/>{ uris: ["spotify:track:…"] }<br/>Bearer: spotify_access_token
        SpotifyAPI-->>Client: 204 No Content
    else Deep link to Spotify app
        User->>Client: Open in Spotify
        Client-->>User: Navigate via spotify:track:… URI
    end
```

## Notes

- **Separation of ownership** — this API's database stores only Spotify URIs as opaque identifiers. Names, artwork, audio features, and all other Spotify content data are never written to SQLite. The client fetches that data directly from Spotify at read time.
- **Client Spotify access token** — the client needs a Spotify access token to call the Spotify API directly and to drive the Web Playback SDK. The mechanism for vending this token to the client (e.g. a `GET /auth/spotify-token` endpoint) is a separate design decision.
- **URI as the join key** — Spotify URIs (e.g. `spotify:track:…`, `spotify:album:…`, `spotify:artist:…`) are the stable identifiers used in join tables. They encode entity type, making it straightforward to tag mixed entity types under a single category.
- **Batch hydration** — Spotify's `/v1/tracks`, `/v1/albums`, and `/v1/artists` endpoints accept comma-separated IDs, so the client can hydrate a full category's items in a small number of requests rather than one per item.
- **ToS compliance** — fetching Spotify data at display time (rather than caching it persistently) keeps the design aligned with Spotify's developer terms, which restrict durable storage of content metadata.
```
