import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '../config/mongo';
import { verifyAccessToken } from '../services/jwt.service';
import { decrypt } from '../services/encryption.service';

const ACCESS_COOKIE_NAME = 'access_token';

const extractAccessToken = (req: Request): string | null => {
  // Cookie (prioridade principal em produção)
  const cookieToken = (req as any).cookies?.[ACCESS_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 20) {
    return cookieToken;
  }

  // Bearer token (útil para Postman, mobile, etc.)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractAccessToken(req);

  if (!token) {
    res.status(401).json({ error: 'Token de acesso não fornecido.' });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);

    const db = await getMongoDb();
    const users = db.collection('users');

    const user = await users.findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado.' });
      return;
    }

    if (user.is_banned) {
      res.status(403).json({ error: 'Sua conta está bloqueada.' });
      return;
    }

    // Verifica token version (proteção contra logout em todos dispositivos)
    const dbTokenVersion = Number(user.token_version ?? 0);
    if (dbTokenVersion !== Number(decoded.tokenVersion ?? 0)) {
      res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
      return;
    }

    // Objeto user limpo e tipado no request
    (req as any).user = {
      userId: user._id.toString(),
      email: decrypt(user.email_encrypted ?? user.email) ?? '',
      role: user.is_owner ? 'owner' : user.is_admin ? 'admin' : user.is_moderator ? 'moderator' : 'user',
      isOwner: Boolean(user.is_owner),
      isAdmin: Boolean(user.is_admin || user.is_owner),
      isModerator: Boolean(user.is_moderator),
      isBanned: Boolean(user.is_banned),
      tokenVersion: dbTokenVersion,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expirado.' });
      return;
    }
    if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Token inválido.' });
      return;
    }

    console.error('Auth Middleware Error:', err);
    res.status(500).json({ error: 'Erro interno ao validar sessão.' });
  }
};