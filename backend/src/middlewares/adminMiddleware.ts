import { Request, Response, NextFunction } from 'express';

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if ((req as any).user && (req as any).user.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Acesso restrito a administradores.' });
}
