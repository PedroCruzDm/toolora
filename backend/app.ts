import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { uploadsRootDir } from './src/config/uploads';

import authRoutes from './src/routes/auth.routes';
import adminRoutes from './src/routes/admin.routes';
import messageRoutes from './src/routes/message.routes';
import toolRoutes from './src/routes/tool.routes';

dotenv.config();

const app = express();

// CORS configuration with explicit origin validation
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://toolora-7a2w.onrender.com',
  'https://toolora-backend.onrender.com',
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers (IE11) return 204 but expect 200
}));

// Explicit preflight handler to ensure OPTIONS always returns CORS headers
app.options('*', cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json());
app.use('/uploads', express.static(uploadsRootDir));

app.use('/api/auth', authRoutes);
app.use('/api/management', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tools', toolRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Backend Node.js rodando!' });
});

export default app;