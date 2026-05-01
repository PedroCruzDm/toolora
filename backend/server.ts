import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.routes';
import adminRoutes from './src/routes/admin.routes';
import messageRoutes from './src/routes/message.routes';
import toolRoutes from './src/routes/tool.routes';
import { uploadsRootDir } from './src/config/uploads';
import { connectDB } from './src/config/db';

dotenv.config();

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadsRootDir));

app.use('/api/auth', authRoutes);
app.use('/api/management', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tools', toolRoutes);

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Backend rodando em http://localhost:${PORT}`);
  });
};

startServer();