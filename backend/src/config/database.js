import mongoose from 'mongoose'

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI não configurada. A API iniciará sem acesso ao banco.')
    return false
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI)
    const productIndexes = await mongoose.connection.collection('products').indexes()
    const legacyReferenceIndex = productIndexes.find((index) => index.unique && index.key?.reference === 1)
    if (legacyReferenceIndex) {
      await mongoose.connection.collection('products').dropIndex(legacyReferenceIndex.name)
      console.log('Índice antigo de referência única removido')
    }
    console.log('MongoDB conectado')
    return true
  } catch (error) {
    console.error('Não foi possível conectar ao MongoDB:', error.message)
    return false
  }
}

