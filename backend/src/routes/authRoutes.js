import { Router } from 'express'
import { getSession, getSetupStatus, login, setup } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'

export const authRouter = Router()

authRouter.post('/login', login)
authRouter.get('/setup-status', getSetupStatus)
authRouter.post('/setup', setup)
authRouter.get('/me', requireAuth, getSession)

