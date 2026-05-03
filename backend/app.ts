import express from 'express';
import path from 'path';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { uploadsRootDir } from './src/config/uploads';

import authRoutes from './src/routes/auth.routes';
import adminRoutes from './src/routes/admin.routes';
import messageRoutes from './src/routes/message.routes';
import toolRoutes from './src/routes/tool.routes';

dotenv.config();

const app = express();

// CORS configuration with explicit origin validation.
// Allow additional production frontends via env variable `FRONTEND_ORIGINS`
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://toolora-7a2w.onrender.com',
  'https://toolora-backend.onrender.com',
  'https://toolora.com.br',
  'https://www.toolora.com.br',
];

const extraOrigins = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...extraOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    // If no origin (same-site or server-to-server), allow
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers (IE11) return 204 but expect 200
}));

// Explicit preflight handler to ensure OPTIONS always returns CORS headers for allowed origins
app.options('*', cors({ origin: allowedOrigins, credentials: true }));

// Allow larger JSON payloads because profile images are sent as base64 data URLs on user update.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadsRootDir));

app.use('/api/auth', authRoutes);
app.use('/api/management', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tools', toolRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Backend Node.js rodando!' });
});

// Keep compatibility with frontend which may call `/api/health`
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend Node.js rodando!' });
});

// Optional: serve frontend build and enable SPA fallback when running as a single-host service.
// Set SERVE_FRONTEND=true in the environment (Render or similar) to enable.
if (process.env.SERVE_FRONTEND === 'true') {
  const staticPath = path.join(process.cwd(), 'frontend', 'dist');
  app.use(express.static(staticPath));

  app.get('*', (req, res) => {
    // Let API, uploads and health endpoints continue to function
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/health')) {
      return res.status(404).end();
    }
    return res.sendFile(path.join(staticPath, 'index.html'));
  });
}

export default app;