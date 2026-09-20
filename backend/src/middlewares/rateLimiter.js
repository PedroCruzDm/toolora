const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({ // Limitador GLOBAL [protege todo o site]
  windowMs: 15 * 60 * 1000,       // 15min
  max: 100,                       // máximo 100 requisições por IP a cada 15 min
  message: { info: 'Muitas requisições foram detectadas. Tente novamente em 15 minutos.' },
  standardHeaders: true,    // Envia headers RateLimit-*
  legacyHeaders: false,
});

const authLimiter = rateLimit({         // Limitador mais rigoroso para autenticação [login/cadastro]
  windowMs: 15 * 60 * 1000,
  max: 8,                               // máximo 8 tentativas
  message: { alert: 'Muitas tentativas de login/cadastro. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Conta apenas as tentativas que falharam
});

const createToolLimiter = rateLimit({ // Limitador específico para criação de ferramentas (opcional, mas recomendado)
  windowMs: 60 * 60 * 1000,           // 1 hora
  max: 20,                            // máximo 20 ferramentas por IP
  message: { info: 'Limite de criação de ferramentas atingido. Tente novamente mais tarde.'},

  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { globalLimiter, authLimiter, createToolLimiter };