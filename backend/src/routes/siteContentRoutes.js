import { Router } from 'express'
import { getHero, updateHero } from '../controllers/siteContentController.js'
import { requireAuth } from '../middleware/auth.js'

export const siteContentRouter = Router()
siteContentRouter.get('/hero', getHero)
siteContentRouter.put('/hero', requireAuth, updateHero)
