import { eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { db } from '../db/index'
import { sessions } from '../db/schema'

declare module 'fastify' {
  interface FastifyRequest {
    userId: number
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing or invalid authorization header' })
    return
  }

  const token = authHeader.slice(7)
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
  })

  if (!session) {
    reply.code(401).send({ error: 'Invalid or expired session token' })
    return
  }

  request.userId = session.userId
}
