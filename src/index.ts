import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import Fastify from 'fastify'
import { authRoutes } from './routes/auth'
import { categoriesRoutes } from './routes/categories'
import { healthRoute } from './routes/health'

const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>()
app.decorateRequest('userId', 0)

app.register(swagger, {
  openapi: {
    info: {
      title: 'Spudify API',
      description: 'Personal API layered on top of Spotify — custom tagging, organization, and convenience endpoints.',
      version: '0.1.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
  },
})

app.register(swaggerUi, {
  routePrefix: '/documentation',
})

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
