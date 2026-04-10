import Fastify from 'fastify'
import { authRoutes } from './routes/auth'
import { healthRoute } from './routes/health'

const app = Fastify({ logger: true })

app.register(healthRoute)
app.register(authRoutes)

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
