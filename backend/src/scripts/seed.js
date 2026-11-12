import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { Admin } from '../models/Admin.js'
import { Product } from '../models/Product.js'

const initialProducts = [
  {
    name: 'Pijama Americano Floral',
    category: 'Pijamas',
    description: 'Conjunto confortável em tecido macio, ideal para noites tranquilas.',
    price: 129.9,
    image: 'https://images.unsplash.com/photo-1617331721458-bd3bd3f9c7f8?auto=format&fit=crop&w=900&q=80',
    featured: true,
    variants: [
      { size: 'P', color: 'Rosa', stock: 3 },
      { size: 'M', color: 'Rosa', stock: 5 },
      { size: 'G', color: 'Azul', stock: 2 },
    ],
  },
  {
    name: 'Conjunto Renda Essencial',
    category: 'Moda íntima',
    description: 'Conjunto delicado com acabamento em renda e excelente sustentação.',
    price: 89.9,
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=80',
    featured: true,
    variants: [
      { size: 'M', color: 'Preto', stock: 4 },
      { size: 'G', color: 'Vinho', stock: 3 },
    ],
  },
]

async function seed() {
  if (!process.env.MONGODB_URI) throw new Error('Configure MONGODB_URI no arquivo backend/.env.')
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD no arquivo backend/.env.')
  }
  if (process.env.ADMIN_PASSWORD.length < 8) {
    throw new Error('ADMIN_PASSWORD deve ter pelo menos 8 caracteres.')
  }

  await mongoose.connect(process.env.MONGODB_URI)

  const email = process.env.ADMIN_EMAIL.trim().toLowerCase()
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)
  await Admin.findOneAndUpdate(
    { email },
    {
      name: process.env.ADMIN_NAME || 'Administrador',
      email,
      passwordHash,
      active: true,
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  )

  const productCount = await Product.countDocuments()
  if (!productCount) await Product.insertMany(initialProducts)

  console.log(`Administrador ${email} configurado com sucesso.`)
  console.log(productCount ? 'Produtos existentes foram preservados.' : 'Produtos iniciais cadastrados.')
}

seed()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })

