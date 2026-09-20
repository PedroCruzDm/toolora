import rateLimit from 'express-rate-limit';
import { Request } from 'express';

const skipPreflight = (req: Request) => req.method === 'OPTIONS';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    info: 'Muitas requisições foram detectadas. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: {
    alert: 'Muitas tentativas de login/cadastro. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipPreflight,
});

export const createToolLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    info: 'Limite de criação de ferramentas atingido. Tente novamente em 1 hora.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
});