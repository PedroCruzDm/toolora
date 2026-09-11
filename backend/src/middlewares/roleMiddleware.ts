import { Request, Response, NextFunction } from 'express';

export type AppRole = 'owner' | 'admin' | 'moderator' | 'user';

type JwtRolePayload = {
  userId?: string;
  email?: string;
  role?: AppRole;
  isOwner?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
};

const rolePriority: Record<AppRole, number> = {
  owner: 4,
  admin: 3,
  moderator: 2,
  user: 1,
};

export const resolveRole = (user: JwtRolePayload): AppRole => {
  if (user.role) return user.role;
  if (user.isOwner) return 'owner';
  if (user.isAdmin) return 'admin';
  if (user.isModerator) return 'moderator';
  return 'user';
};

const hasRole = (user: JwtRolePayload | undefined, minimumRole: 'owner' | 'admin' | 'moderator' | 'user') => {
  if (!user) return false;

  const userRole = resolveRole(user);
  return rolePriority[userRole] >= rolePriority[minimumRole];
};

export const ownerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (hasRole((req as any).user, 'owner')) {
    return next();
  }

  return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (hasRole((req as any).user, 'admin')) {
    return next();
  }

  return res.status(403).json({ error: 'Acesso restrito a administradores.' });
};

export const moderatorMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (hasRole((req as any).user, 'moderator')) {
    return next();
  }

  return res.status(403).json({ error: 'Acesso restrito à moderação.' });
};