import mongoose from 'mongoose'

export const VALID_STATUSES = ['pendente', 'enviado', 'concluído', 'cancelado']

export const STATUS_TRANSITIONS = {
  pendente: ['enviado', 'cancelado'],
  enviado: ['concluído', 'cancelado'],
  concluído: [],
  cancelado: [],
}

export function canTransitionStatus(currentStatus, nextStatus) {
  return currentStatus === nextStatus || (STATUS_TRANSITIONS[currentStatus] || []).includes(nextStatus)
}

export function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeRequestedItems(items) {
  if (!Array.isArray(items) || !items.length) return null

  const groupedItems = new Map()
  for (const item of items) {
    const quantity = Number.parseInt(item.quantity, 10)
    if (!mongoose.isValidObjectId(item.productId) || !item.size || !item.color || quantity < 1) {
      return null
    }

    const size = String(item.size).trim()
    const color = String(item.color).trim()
    if (!size || !color) return null

    const key = `${item.productId}:${size}:${color}`
    const existing = groupedItems.get(key)
    groupedItems.set(key, {
      productId: item.productId,
      size,
      color,
      quantity: (existing?.quantity || 0) + quantity,
    })
  }

  return [...groupedItems.values()]
}

