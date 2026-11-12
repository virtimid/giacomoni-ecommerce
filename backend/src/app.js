import cors from 'cors'
import express from 'express'
import { productRouter } from './routes/productRoutes.js'
import { orderRouter } from './routes/orderRoutes.js'
import { authRouter } from './routes/authRoutes.js'
import { adminRouter } from './routes/adminRoutes.js'

export const app = express()

const configuredOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

function originIsAllowed(origin) {
  if (!origin) return true
  if (configuredOrigins.includes(origin)) return true
  return process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
}

app.use(
  cors({
    origin(origin, callback) {
      callback(originIsAllowed(origin) ? null : new Error('Origem não autorizada pelo CORS'), originIsAllowed(origin))
    },
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Giacomoni API' })
})

app.use('/api/products', productRouter)
app.use('/api/orders', orderRouter)
app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)

app.use((_req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' })
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(error.name === 'ValidationError' ? 400 : 500).json({
    message: error.name === 'ValidationError' ? 'Dados inválidos.' : 'Erro interno do servidor.',
    details: error.message,
  })
})
