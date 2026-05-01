import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getMongoDb } from '../config/mongo';

const SECRET: string = process.env.JWT_SECRET ?? '';

if (!SECRET) {
  throw new Error('JWT_SECRET não configurado. Defina JWT_SECRET no ambiente.');
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET) as any;

    getMongoDb().then(async (db) => {
      const users = db.collection('users');
      const user = await users.findOne({ _id: new ObjectId(decoded.userId) });

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado.' });
      }

      if (user.is_banned) {
        return res.status(403).json({ error: 'Conta bloqueada.' });
      }

      (req as any).user = {
        ...decoded,
        email: user.email,
        isOwner: Boolean(decoded.isOwner ?? user.is_owner),
        isAdmin: Boolean(decoded.isAdmin ?? user.is_admin),
        isModerator: Boolean(decoded.isModerator ?? user.is_moderator),
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