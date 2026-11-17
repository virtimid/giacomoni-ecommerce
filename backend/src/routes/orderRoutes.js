import { Router } from 'express'
import {
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
} from '../controllers/orderController.js'
import { requireAuth } from '../middleware/auth.js'
import { optionalCustomerAuth } from '../middleware/customerAuth.js'

export const orderRouter = Router()

orderRouter.post('/', optionalCustomerAuth, createOrder)
orderRouter.get('/', requireAuth, listOrders)
orderRouter.get('/:id', requireAuth, getOrder)
orderRouter.patch('/:id/status', requireAuth, updateOrderStatus)

