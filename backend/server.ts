// backend/server.ts
import app from './app';           // ou './src/app'
import { connectDB } from './src/config/db';

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 8080;
  
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌍 URL: https://toolora-backend.onrender.com`);
  });
};

startServer();