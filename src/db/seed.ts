import { db } from './index'
import { categories, sessions, spotifyTokens, users } from './schema'

// Seed a deterministic test user so the token is stable across runs.
const TEST_SPOTIFY_USER_ID = 'test_spotify_user'
const TEST_SESSION_TOKEN = 'test_session_token'

async function seed() {
  // User — upsert so re-runs don't fail on the unique spotify_user_id constraint
  const [user] = await db
    .insert(users)
    .values({
      spotifyUserId: TEST_SPOTIFY_USER_ID,
      email: 'test@example.com',
      displayName: 'Test User',
    })
    .onConflictDoNothing()
    .returning()

  // If user already existed, fetch it
  const { eq } = await import('drizzle-orm')
  const testUser =
    user ?? (await db.query.users.findFirst({ where: eq(users.spotifyUserId, TEST_SPOTIFY_USER_ID) }))!

  // Spotify tokens — placeholder values; real tokens aren't needed for category routes
  await db
    .insert(spotifyTokens)
    .values({
      userId: testUser.id,
      accessToken: 'fake_access_token',
      refreshToken: 'fake_refresh_token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    .onConflictDoNothing()

  // Session — fixed token so curl/Postman commands stay stable across re-seeds
  await db
    .insert(sessions)
    .values({ userId: testUser.id, token: TEST_SESSION_TOKEN })
    .onConflictDoNothing()

  // Sample categories
  const sampleCategories = ['Classical', 'Electronic', 'Hip-Hop', 'Jazz', 'Rock']
  await db
    .insert(categories)
    .values(sampleCategories.map((name) => ({ userId: testUser.id, name })))
    .onConflictDoNothing()

  console.log(`Seeded user: ${testUser.id} (${testUser.displayName})`)
  console.log(`Session token: ${TEST_SESSION_TOKEN}`)
  console.log(`  Authorization: Bearer ${TEST_SESSION_TOKEN}`)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
