import crypto from 'node:crypto'

const API_URL = 'https://api.mercadopago.com'

async function mercadoPagoRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.message || data.cause?.[0]?.description || 'O Mercado Pago não conseguiu processar o Pix.')
    error.providerStatus = response.status
    error.providerDetails = data
    throw error
  }
  return data
}

export function pixIsConfigured() {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN)
}

export async function createPixPayment({ order, payerDocument, notificationUrl }) {
  const expiration = new Date(Date.now() + 30 * 60 * 1000)
  const payment = await mercadoPagoRequest('/v1/payments', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': `giacomoni-${order._id}` },
    body: JSON.stringify({
      transaction_amount: Number(order.total),
      description: `Pedido Giacomoni #${String(order._id).slice(-6).toUpperCase()}`,
      payment_method_id: 'pix',
      external_reference: String(order._id),
      date_of_expiration: expiration.toISOString(),
      notification_url: notificationUrl,
      payer: {
        email: order.customer.email,
        first_name: order.customer.name.split(' ')[0],
        last_name: order.customer.name.split(' ').slice(1).join(' ') || undefined,
        identification: { type: 'CPF', number: payerDocument },
      },
    }),
  })
  const transaction = payment.point_of_interaction?.transaction_data || {}
  return {
    providerPaymentId: String(payment.id),
    status: normalizePaymentStatus(payment.status),
    statusDetail: payment.status_detail || '',
    qrCode: transaction.qr_code || '',
    qrCodeBase64: transaction.qr_code_base64 || '',
    ticketUrl: transaction.ticket_url || '',
    expiresAt: payment.date_of_expiration ? new Date(payment.date_of_expiration) : expiration,
  }
}

export async function getMercadoPagoPayment(paymentId) {
  return mercadoPagoRequest(`/v1/payments/${encodeURIComponent(paymentId)}`)
}

export function normalizePaymentStatus(status) {
  if (status === 'approved') return 'approved'
  if (['rejected'].includes(status)) return 'rejected'
  if (['cancelled', 'canceled'].includes(status)) return 'cancelled'
  if (['refunded', 'charged_back'].includes(status)) return 'refunded'
  return 'pending'
}

export function validateMercadoPagoSignature(req) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
  if (!secret) return true
  const signature = String(req.headers['x-signature'] || '')
  const requestId = String(req.headers['x-request-id'] || '')
  const values = Object.fromEntries(signature.split(',').map((part) => part.trim().split('=')))
  if (!values.ts || !values.v1) return false
  const dataId = String(req.query['data.id'] || req.body?.data?.id || '').toLowerCase()
  const manifest = `id:${dataId};${requestId ? `request-id:${requestId};` : ''}ts:${values.ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  const received = Buffer.from(values.v1, 'hex')
  const calculated = Buffer.from(expected, 'hex')
  return received.length === calculated.length && crypto.timingSafeEqual(received, calculated)
}
