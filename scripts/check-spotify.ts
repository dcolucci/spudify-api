// Quick credential check — run with: bun run scripts/check-spotify.ts
// Uses the Client Credentials flow (no user login required).
// Delete this file once you're satisfied credentials are working.

import { SpotifyApi } from '@spotify/web-api-ts-sdk'

const clientId = process.env.SPOTIFY_CLIENT_ID
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env')
  process.exit(1)
}

const api = SpotifyApi.withClientCredentials(clientId, clientSecret)

// Fetch a well-known public artist as a sanity check
const artist = await api.artists.get('0OdUWJ0sBjDrqHygGUXeCF') // Band of Horses

console.log('Credentials valid.')
console.log(`Fetched artist: ${artist.name} (${artist.followers.total.toLocaleString()} followers)`)
