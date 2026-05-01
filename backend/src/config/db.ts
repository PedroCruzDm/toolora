// backend/src/config/db.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ ERRO CRÍTICO: MONGODB_URI não foi encontrada!');
  console.error('Verifique se a variável está configurada no Render.');
  // Não encerra o processo para evitar que o Render mate o serviço
} else {
  console.log('MONGODB_URI encontrada, comprimento:', MONGODB_URI.length);
}

export const connectDB = async () => {
  if (!MONGODB_URI) {
    console.error('❌ Não foi possível conectar: MONGODB_URI está vazia ou indefinida.');
    return;
  }

  try {
    console.log('🔄 Tentando conectar ao MongoDB Atlas...');
    console.log('URI começa com:', MONGODB_URI.substring(0, 50) + '...');

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 60000,
    });

    console.log('✅ MongoDB Atlas conectado com sucesso!');
  } catch (error: any) {
    console.error('❌ Falha na conexão com MongoDB Atlas:', error.message);
    if (error.name === 'MongooseServerSelectionError') {
      console.error('   → Possíveis causas:');
      console.error('     1. IP do Render não liberado no MongoDB Atlas (0.0.0.0/0)');
      console.error('     2. Usuário/Senha incorretos na MONGODB_URI');
      console.error('     3. Cluster pausado ou rede bloqueada');
    }
  }
};