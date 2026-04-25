import Fastify from 'fastify'
import { authRoutes } from './routes/auth'
import { categoriesRoutes } from './routes/categories'
import { healthRoute } from './routes/health'

declare module 'fastify' {
  interface FastifyRequest {
    userId: number
  }
}

const app = Fastify({ logger: true })
app.decorateRequest('userId', 0)

app.register(healthRoute)
app.register(authRoutes)
app.register(categoriesRoutes)

const start = async () => {
  try {
    await app.listen({
      port: Number(process.env.PORT) || 3000,
      host: '0.0.0.0',
    })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
