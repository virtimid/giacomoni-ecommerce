import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canTransitionStatus,
  escapeRegularExpression,
  normalizeRequestedItems,
} from '../src/services/orderRules.js'

const productId = '507f1f77bcf86cd799439011'

test('agrupa produtos da mesma variação antes de reservar o estoque', () => {
  const result = normalizeRequestedItems([
    { productId, size: 'M', color: 'Rosa', quantity: 2 },
    { productId, size: 'M', color: 'Rosa', quantity: 3 },
  ])

  assert.equal(result.length, 1)
  assert.equal(result[0].quantity, 5)
})

test('mantém tamanho e cor diferentes como itens separados', () => {
  const result = normalizeRequestedItems([
    { productId, size: 'M', color: 'Rosa', quantity: 1 },
    { productId, size: 'G', color: 'Rosa', quantity: 1 },
  ])

  assert.equal(result.length, 2)
})

test('rejeita quantidade inválida e identificador inválido', () => {
  assert.equal(normalizeRequestedItems([{ productId, size: 'M', color: 'Rosa', quantity: 0 }]), null)
  assert.equal(normalizeRequestedItems([{ productId: 'invalido', size: 'M', color: 'Rosa', quantity: 1 }]), null)
})

test('aceita apenas as transições previstas para pedidos', () => {
  assert.equal(canTransitionStatus('pendente', 'enviado'), true)
  assert.equal(canTransitionStatus('pendente', 'cancelado'), true)
  assert.equal(canTransitionStatus('enviado', 'concluído'), true)
  assert.equal(canTransitionStatus('concluído', 'pendente'), false)
  assert.equal(canTransitionStatus('cancelado', 'enviado'), false)
})

test('escapa caracteres especiais da busca', () => {
  assert.equal(escapeRegularExpression('cliente.*(teste)'), 'cliente\\.\\*\\(teste\\)')
})

