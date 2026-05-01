import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não está definida no .env');
  process.exit(1);
}

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Atlas conectado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao conectar no MongoDB:', error);
    process.exit(1);
  }
};

mongoose.connection.on('connected', () => {
  console.log('MongoDB: Conexão estabelecida');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB: Erro na conexão', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB: Desconectado');
});