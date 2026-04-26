import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

import authRoutes from './src/routes/auth.routes';
import adminRoutes from './src/routes/admin.routes';
import messageRoutes from './src/routes/message.routes';
import toolRoutes from './src/routes/tool.routes';

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tools', toolRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Backend Node.js rodando!' });
});

export default app;