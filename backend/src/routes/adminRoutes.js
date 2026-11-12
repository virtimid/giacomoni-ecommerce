import { Router } from 'express'
import { getDashboardStats } from '../controllers/adminController.js'
import { requireAuth } from '../middleware/auth.js'

export const adminRouter = Router()

adminRouter.use(requireAuth)
adminRouter.get('/stats', getDashboardStats)
