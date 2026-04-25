# Usage Guide

This API is invite-only. Access requires completing the Spotify OAuth flow to obtain a session token, which is then passed as a `Bearer` token on all subsequent requests.

---

## 1. Authenticate

### Production / real use

Navigate to the login endpoint in a browser:

```
GET /auth/login
```

This redirects you to Spotify's authorization page. After granting permission, Spotify redirects back to `/auth/callback` and the API responds with your session token:

```json
{ "token": "<session_token>" }
```

Save this token — you'll use it as the `Authorization` header for all other requests.

### Local development

If you've run `bun run db:seed`, a test user and fixed session token are already in the database. Skip the OAuth flow entirely and use:

```
Authorization: Bearer test_session_token
```

---

## 2. Using the session token

Pass the token in the `Authorization` header on every authenticated request:

```bash
curl http://localhost:3000/categories \
  -H "Authorization: Bearer <session_token>"
```

A missing or invalid token returns `401`.

---

## 3. Endpoints

### Health check

```
GET /health
```

No authentication required. Returns `200 { "status": "ok" }`. Useful for confirming the server is up.

---

### Categories

Categories are user-defined labels you can apply to Spotify tracks, albums, and artists.

#### List categories

```
GET /categories
```

Returns all categories for the authenticated user, sorted alphabetically.

**Response `200`**
```json
[
  { "id": 1, "name": "Classical" },
  { "id": 2, "name": "Jazz" }
]
```

Returns an empty array if no categories exist yet.

**Example**
```bash
curl http://localhost:3000/categories \
  -H "Authorization: Bearer <session_token>"
```

---

#### Create a category

```
POST /categories
```

**Body**
```json
{ "name": "Jazz" }
```

`name` is required and must be a non-empty string. Names are trimmed and must be unique per user.

**Response `201`**
```json
{ "id": 3, "name": "Jazz" }
```

**Errors**
| Status | Reason |
|--------|--------|
| `400` | `name` is missing or blank |
| `409` | A category with that name already exists |

**Example**
```bash
curl -X POST http://localhost:3000/categories \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Jazz"}'
```
