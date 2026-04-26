import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

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

    pool.execute(
      'SELECT id, email, is_owner, is_admin, is_moderator, is_banned FROM users WHERE id = ? LIMIT 1',
      [decoded.userId]
    ).then(([rows]) => {
      const user = Array.isArray(rows) ? (rows[0] as any) : null;

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado.' });
      }

      if (user.is_banned) {
        return res.status(403).json({ error: 'Conta bloqueada.' });
      }

      (req as any).user = {
        ...decoded,
        email: user.email,
        isOwner: Boolean(user.is_owner),
        isAdmin: Boolean(user.is_admin),
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