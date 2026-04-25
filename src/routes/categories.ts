import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { categories } from '../db/schema'
import { authenticate } from '../lib/authenticate'

const CategorySchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
})

const ErrorSchema = Type.Object({ error: Type.String() })

export const categoriesRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/categories', {
    preHandler: [authenticate],
    schema: {
      security: [{ bearerAuth: [] }],
      description: 'Returns all categories for the authenticated user, sorted alphabetically.',
      response: {
        200: Type.Array(CategorySchema),
        401: ErrorSchema,
      },
    },
  }, async (request, reply) => {
    const userCategories = await db.query.categories.findMany({
      where: eq(categories.userId, request.userId),
      columns: { id: true, name: true },
      orderBy: (c, { asc }) => asc(c.name),
    })

    reply.send(userCategories)
  })

  app.post('/categories', {
    preHandler: [authenticate],
    schema: {
      security: [{ bearerAuth: [] }],
      description: 'Creates a new category for the authenticated user.',
      body: Type.Object({
        name: Type.String({ minLength: 1 }),
      }),
      response: {
        201: CategorySchema,
        400: ErrorSchema,
        401: ErrorSchema,
        409: ErrorSchema,
      },
    },
  }, async (request, reply) => {
    const trimmedName = request.body.name.trim()

    if (trimmedName.length === 0) {
      reply.code(400).send({ error: 'name must not be blank' })
      return
    }

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
  })
}
