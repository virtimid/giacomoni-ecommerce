import { Router } from 'express'
import { getPaymentConfig, getPixStatus, mercadoPagoWebhook } from '../controllers/paymentController.js'

export const paymentRouter = Router()
paymentRouter.get('/config', getPaymentConfig)
paymentRouter.get('/pix/:orderId', getPixStatus)
paymentRouter.post('/mercado-pago/webhook', mercadoPagoWebhook)
