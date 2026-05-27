import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '../config/mongo';
import { verifyAccessToken } from '../services/jwt.service';

const ACCESS_COOKIE_NAME = 'access_token';

const extractAccessToken = (req: Request) => {
  const cookieToken = (req as any).cookies?.[ACCESS_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
};

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractAccessToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  try {
    const decoded = verifyAccessToken(token);

    getMongoDb().then(async (db) => {
      const users = db.collection('users');
      const user = await users.findOne({ _id: new ObjectId(decoded.userId) });

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado.' });
      }

      if (user.is_banned) {
        return res.status(403).json({ error: 'Conta bloqueada.' });
      }

      const dbTokenVersion = Number(user.token_version ?? 0);
      if (dbTokenVersion !== Number(decoded.tokenVersion ?? 0)) {
        return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
      }

      const role = user.is_owner
        ? 'owner'
        : user.is_admin
          ? 'admin'
          : user.is_moderator
            ? 'moderator'
            : 'user';

      (req as any).user = {
        ...decoded,
        userId: user._id.toString(),
        email: user.email,
        role,
        isOwner: Boolean(user.is_owner),
        isAdmin: Boolean(user.is_admin || user.is_owner),
        isModerator: Boolean(user.is_moderator),
        isBanned: Boolean(user.is_banned),
      };

      return next();
    }).catch(() => {
      return res.status(500).json({ error: 'Erro interno ao validar sessão.' });
    });
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido.' });
  }
}