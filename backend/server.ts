// backend/server.ts
import app from './app';
import { connectDB } from './src/config/db';
import { assertEncryptionKey } from './src/services/encryption.service';

const startServer = async () => {
  console.log('Iniciando servidor...');
  assertEncryptionKey();
  
  await connectDB();

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌍 URL: https://toolora-backend.onrender.com`);
  });
};

startServer();