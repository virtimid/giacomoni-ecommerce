import mongoose from 'mongoose'

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI não configurada. A API iniciará sem acesso ao banco.')
    return false
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('MongoDB conectado')
    return true
  } catch (error) {
    console.error('Não foi possível conectar ao MongoDB:', error.message)
    return false
  }
}

