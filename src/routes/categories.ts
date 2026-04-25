import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { db } from '../db/index'
import { categories } from '../db/schema'
import { authenticate } from '../lib/authenticate'

type CreateCategoryBody = {
  name: string
}

export async function categoriesRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateCategoryBody }>(
    '/categories',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { name } = request.body

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        reply.code(400).send({ error: 'name is required' })
        return
      }

      const trimmedName = name.trim()

      const existing = await db.query.categories.findFirst({
        where: (c, { and }) => and(eq(c.userId, request.userId), eq(c.name, trimmedName)),
      })

      if (existing) {
        reply.code(409).send({ error: `Category "${trimmedName}" already exists` })
        return
      }

      const [category] = await db
        .insert(categories)
        .values({ userId: request.userId, name: trimmedName })
        .returning({ id: categories.id, name: categories.name })

      reply.code(201).send(category)
    }
  )
}
