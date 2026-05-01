// backend/src/config/db.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ ERRO: MONGODB_URI não está definida no ambiente!');
  console.error('Verifique se a variável está configurada no Render.');
  process.exit(1);
}

export const connectDB = async () => {
  try {
    console.log('🔄 Tentando conectar ao MongoDB Atlas...');
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,   // timeout de 10 segundos
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB Atlas conectado com sucesso!');
  } catch (error: any) {
    console.error('❌ Erro ao conectar no MongoDB Atlas:', error.message);
    if (error.name === 'MongooseServerSelectionError') {
      console.error('   → Verifique se a MONGODB_URI está correta e se o IP do Render está liberado no Atlas.');
    }
    // Não encerra o processo para o Render não matar o serviço imediatamente
    // process.exit(1);
  }
};