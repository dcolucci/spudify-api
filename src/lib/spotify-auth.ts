import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { spotifyTokens } from '../db/schema'

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

// Refresh proactively when under 5 minutes remain, to avoid expiry mid-request
const EXPIRY_BUFFER_MS = 5 * 60 * 1000

type SpotifyRefreshResponse = {
  access_token: string
  refresh_token?: string // Spotify only includes this when rotating the refresh token
  expires_in: number
}

/**
 * Returns a valid Spotify access token for the given user.
 * Refreshes transparently if the stored token is expired or about to expire.
 * Throws if no token row exists for the user.
 */
export async function getValidAccessToken(userId: number): Promise<string> {
  const tokenRow = await db.query.spotifyTokens.findFirst({
    where: eq(spotifyTokens.userId, userId),
  })

  if (!tokenRow) {
    throw new Error(`No Spotify token found for user ${userId}`)
  }

  const timeRemaining = tokenRow.expiresAt.getTime() - Date.now()
  if (timeRemaining >= EXPIRY_BUFFER_MS) {
    return tokenRow.accessToken
  }

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRow.refreshToken,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Spotify token refresh failed (${res.status}): ${body}`)
  }

  const data = (await res.json()) as SpotifyRefreshResponse

  await db
    .update(spotifyTokens)
    .set({
      accessToken: data.access_token,
      ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      updatedAt: new Date(),
    })
    .where(eq(spotifyTokens.userId, userId))

  return data.access_token
}
