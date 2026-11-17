import { Router } from 'express'
import { changePassword, forgotPassword, getMe, listMyOrders, login, register, resetPassword, updateMe } from '../controllers/customerController.js'
import { requireCustomerAuth } from '../middleware/customerAuth.js'

export const customerRouter = Router()
customerRouter.post('/register', register)
customerRouter.post('/login', login)
customerRouter.post('/forgot-password', forgotPassword)
customerRouter.post('/reset-password', resetPassword)
customerRouter.get('/me', requireCustomerAuth, getMe)
customerRouter.put('/me', requireCustomerAuth, updateMe)
customerRouter.patch('/password', requireCustomerAuth, changePassword)
customerRouter.get('/orders', requireCustomerAuth, listMyOrders)
