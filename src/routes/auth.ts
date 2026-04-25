import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { randomBytes } from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { sessions, spotifyTokens, users } from '../db/schema'

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-library-read',
  'user-top-read',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ')

// In-memory CSRF state store. Acceptable for a single-process deployment.
// state token -> expiry timestamp
const pendingStates = new Map<string, number>()

type SpotifyTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
}

type SpotifyProfileResponse = {
  id: string
  email: string
  display_name: string
}

const ErrorSchema = Type.Object({ error: Type.String() })

export const authRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // Step 1: redirect the user to Spotify's authorization page
  app.get('/auth/login', {
    schema: {
      description: 'Redirects the user to Spotify\'s OAuth authorization page.',
      response: {
        302: Type.Null({ description: 'Redirect to Spotify authorization' }),
      },
    },
  }, async (_request, reply) => {
    const state = randomBytes(16).toString('hex')
    pendingStates.set(state, Date.now() + 10 * 60 * 1000) // expires in 10 min

    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      scope: SCOPES,
      state,
    })

    reply.redirect(`${SPOTIFY_AUTH_URL}?${params}`)
  })

  // Step 2: Spotify redirects back here with an authorization code
  app.get('/auth/callback', {
    schema: {
      description: 'OAuth callback. Spotify redirects here after the user grants permission.',
      querystring: Type.Object({
        code: Type.Optional(Type.String()),
        error: Type.Optional(Type.String()),
        state: Type.Optional(Type.String()),
      }),
      response: {
        200: Type.Object({ token: Type.String() }),
        400: ErrorSchema,
        403: ErrorSchema,
        502: ErrorSchema,
      },
    },
  }, async (request, reply) => {
    const { code, error, state } = request.query

    if (error) {
      reply.code(400).send({ error: `Spotify authorization denied: ${error}` })
      return
    }

    const stateExpiry = state ? pendingStates.get(state) : undefined
    if (!state || stateExpiry === undefined || stateExpiry < Date.now()) {
      reply.code(400).send({ error: 'Invalid or expired state parameter' })
      return
    }
    pendingStates.delete(state)

    if (!code) {
      reply.code(400).send({ error: 'Missing authorization code' })
      return
    }

    // Exchange the authorization code for access + refresh tokens
    const tokenRes = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      }),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      request.log.error({ status: tokenRes.status, body }, 'Spotify token exchange failed')
      reply.code(502).send({ error: 'Failed to exchange authorization code' })
      return
    }

    const tokenData = (await tokenRes.json()) as SpotifyTokenResponse

    // Fetch the user's Spotify profile to get their identity
    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!profileRes.ok) {
      reply.code(502).send({ error: 'Failed to fetch Spotify profile' })
      return
    }

    const profile = (await profileRes.json()) as SpotifyProfileResponse

    // Allowlist check — set ALLOWED_SPOTIFY_USER_IDS in .env as a comma-separated
    // list of Spotify user IDs to restrict access. Leave unset to allow anyone.
    const allowlist = process.env.ALLOWED_SPOTIFY_USER_IDS
    if (allowlist) {
      const allowed = allowlist.split(',').map((id) => id.trim())
      if (!allowed.includes(profile.id)) {
        reply.code(403).send({ error: 'This Spotify account is not authorized.' })
        return
      }
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    // Upsert user and their tokens
    const existingUser = await db.query.users.findFirst({
      where: eq(users.spotifyUserId, profile.id),
    })

    let userId: number

    if (existingUser) {
      userId = existingUser.id
      await db
        .update(spotifyTokens)
        .set({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(spotifyTokens.userId, userId))
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          spotifyUserId: profile.id,
          email: profile.email,
          displayName: profile.display_name,
        })
        .returning()

      userId = newUser.id

      await db.insert(spotifyTokens).values({
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
      })
    }

    // Issue a session token
    const sessionToken = randomBytes(32).toString('hex')
    await db.insert(sessions).values({ userId, token: sessionToken })

    reply.send({ token: sessionToken })
  })
}
