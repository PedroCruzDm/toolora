import { Request, Response, NextFunction } from 'express';

type JwtRolePayload = {
  userId?: number;
  email?: string;
  isOwner?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
};

const hasRole = (user: JwtRolePayload | undefined, roles: Array<'owner' | 'admin' | 'moderator'>) => {
  if (!user) return false;

  const isOwner = Boolean(user.isOwner);
  const isAdmin = Boolean(user.isAdmin);
  const isModerator = Boolean(user.isModerator);

  if (roles.includes('owner') && isOwner) return true;
  if (roles.includes('admin') && (isOwner || isAdmin)) return true;
  if (roles.includes('moderator') && (isOwner || isAdmin || isModerator)) return true;

  return false;
};

export const ownerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (hasRole((req as any).user, ['owner'])) {
    return next();
  }

  return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (hasRole((req as any).user, ['owner', 'admin'])) {
    return next();
  }

  return res.status(403).json({ error: 'Acesso restrito a administradores.' });
};

export const moderatorMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (hasRole((req as any).user, ['owner', 'admin', 'moderator'])) {
    return next();
  }

  return res.status(403).json({ error: 'Acesso restrito à moderação.' });
};