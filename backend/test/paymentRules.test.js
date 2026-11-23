import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import { normalizePaymentStatus, validateMercadoPagoSignature } from '../src/services/mercadoPagoService.js'

test('normaliza os status retornados pelo Mercado Pago', () => {
  assert.equal(normalizePaymentStatus('approved'), 'approved')
  assert.equal(normalizePaymentStatus('pending'), 'pending')
  assert.equal(normalizePaymentStatus('in_process'), 'pending')
  assert.equal(normalizePaymentStatus('rejected'), 'rejected')
  assert.equal(normalizePaymentStatus('cancelled'), 'cancelled')
  assert.equal(normalizePaymentStatus('refunded'), 'refunded')
})

test('valida a assinatura do webhook sem expor a chave', () => {
  const previous = process.env.MERCADO_PAGO_WEBHOOK_SECRET
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'segredo-de-teste'
  const ts = '1704908010'
  const id = '123456'
  const requestId = 'abc-123'
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`
  const signature = crypto.createHmac('sha256', process.env.MERCADO_PAGO_WEBHOOK_SECRET).update(manifest).digest('hex')
  const req = { headers: { 'x-signature': `ts=${ts},v1=${signature}`, 'x-request-id': requestId }, query: { 'data.id': id }, body: {} }
  assert.equal(validateMercadoPagoSignature(req), true)
  req.headers['x-signature'] = `ts=${ts},v1=${'0'.repeat(64)}`
  assert.equal(validateMercadoPagoSignature(req), false)
  if (previous === undefined) delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
  else process.env.MERCADO_PAGO_WEBHOOK_SECRET = previous
})
