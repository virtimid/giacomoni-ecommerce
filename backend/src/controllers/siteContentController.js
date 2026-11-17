import mongoose from 'mongoose'
import { SiteContent } from '../models/SiteContent.js'

export const defaultHero = {
  eyebrow: 'Conforto para todos os momentos', title: 'Vista-se de carinho, durma com conforto.',
  description: 'Peças escolhidas para transformar sua rotina em momentos mais leves e especiais.',
  buttonText: 'Conhecer coleção',
  image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1000&q=85',
  imageEyebrow: 'Nova coleção', imageTitle: 'Essência', imageSubtitle: 'Delicadeza em cada detalhe',
}

export async function getHero(_req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) return res.json({ hero: defaultHero })
    const saved = await SiteContent.findOne({ key: 'hero' }).lean()
    res.json({ hero: saved ? { ...defaultHero, ...saved } : defaultHero })
  } catch (error) { next(error) }
}

export async function updateHero(req, res, next) {
  try {
    const hero = Object.fromEntries(Object.keys(defaultHero).map((field) => [field, String(req.body[field] || '').trim()]))
    if (Object.values(hero).some((value) => !value)) return res.status(400).json({ message: 'Preencha todos os campos do banner.' })
    if (!/^https?:\/\//i.test(hero.image) && !/^data:image\/(jpeg|png|webp);base64,/i.test(hero.image)) return res.status(400).json({ message: 'Use uma URL válida ou selecione uma imagem do computador.' })
    const saved = await SiteContent.findOneAndUpdate({ key: 'hero' }, { ...hero, key: 'hero', updatedBy: req.admin.id }, { new: true, upsert: true, runValidators: true })
    res.json({ message: 'Banner principal atualizado.', hero: saved })
  } catch (error) { next(error) }
}
