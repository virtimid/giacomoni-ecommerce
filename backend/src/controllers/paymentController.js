import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { getMercadoPagoPayment, normalizePaymentStatus, pixIsConfigured, validateMercadoPagoSignature } from '../services/mercadoPagoService.js'

async function returnOrderStock(order) {
  if (order.stockReturned) return
  for (const item of order.items) {
    await Product.updateOne({ _id: item.product, variants: { $elemMatch: { size: item.size, color: item.color } } }, { $inc: { 'variants.$.stock': item.quantity } })
  }
  order.stockReturned = true
}

async function syncPayment(order, providerPayment) {
  const status = normalizePaymentStatus(providerPayment.status)
  order.payment.status = status
  order.payment.statusDetail = providerPayment.status_detail || ''
  if (status === 'approved' && !order.payment.paidAt) order.payment.paidAt = new Date(providerPayment.date_approved || Date.now())
  if (['rejected', 'cancelled', 'refunded'].includes(status) && order.status !== 'cancelado') {
    await returnOrderStock(order)
    order.status = 'cancelado'
    order.cancelledAt = new Date()
    order.statusHistory.push({ status: 'cancelado', changedAt: new Date() })
  }
  await order.save()
}

export function getPaymentConfig(_req, res) {
  res.json({ pixEnabled: pixIsConfigured() })
}

export async function getPixStatus(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(400).json({ message: 'Pedido inválido.' })
    const tokenHash = crypto.createHash('sha256').update(String(req.query.token || '')).digest('hex')
    const order = await Order.findOne({ _id: req.params.orderId, 'payment.accessTokenHash': tokenHash })
    if (!order || order.payment.method !== 'pix') return res.status(404).json({ message: 'Pagamento não encontrado.' })
    if (order.payment.providerPaymentId && order.payment.status === 'pending') {
      try { await syncPayment(order, await getMercadoPagoPayment(order.payment.providerPaymentId)) } catch (error) { console.error('Falha ao consultar pagamento Pix:', error.message) }
    }
    res.json({ payment: { status: order.payment.status, statusDetail: order.payment.statusDetail, paidAt: order.payment.paidAt, expiresAt: order.payment.expiresAt } })
  } catch (error) { next(error) }
}

export async function mercadoPagoWebhook(req, res, next) {
  try {
    if (!validateMercadoPagoSignature(req)) return res.status(401).json({ message: 'Assinatura inválida.' })
    const paymentId = String(req.query['data.id'] || req.body?.data?.id || '')
    if (!paymentId) return res.sendStatus(200)
    const providerPayment = await getMercadoPagoPayment(paymentId)
    const orderId = String(providerPayment.external_reference || '')
    if (!mongoose.isValidObjectId(orderId)) return res.sendStatus(200)
    const order = await Order.findOne({ _id: orderId, 'payment.providerPaymentId': String(providerPayment.id) })
    if (order) await syncPayment(order, providerPayment)
    res.sendStatus(200)
  } catch (error) {
    if (error.providerStatus === 404) return res.sendStatus(200)
    next(error)
  }
}
