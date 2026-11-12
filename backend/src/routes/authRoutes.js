import { Router } from 'express'
import { getSession, login } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'

export const authRouter = Router()

authRouter.post('/login', login)
authRouter.get('/me', requireAuth, getSession)

