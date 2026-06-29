import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('Segredos JWT não configurados. Defina JWT_ACCESS_SECRET e JWT_REFRESH_SECRET no .env');
}

// Garantia de tipo para o TypeScript
const accessSecret: string = ACCESS_SECRET;
const refreshSecret: string = REFRESH_SECRET;

export type AppRole = 'owner' | 'admin' | 'moderator' | 'user';

export type JwtFlags = {
  isOwner?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
};

export type AccessTokenPayload = {
  userId: string;
  email: string;
  role: AppRole;
  tokenVersion: number;
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  iat?: number;
  exp?: number;
};

export type RefreshTokenPayload = {
  userId: string;
  role: AppRole;
  tokenVersion: number;
  jti: string;
  iat?: number;
  exp?: number;
};

const resolveRole = (flags: JwtFlags): AppRole => {
  if (flags.isOwner) return 'owner';
  if (flags.isAdmin) return 'admin';
  if (flags.isModerator) return 'moderator';
  return 'user';
};

export function generateAccessToken(
  userId: string,
  email: string,
  flags: JwtFlags,
  tokenVersion: number = 0
): string {
  const role = resolveRole(flags);

  return jwt.sign(
    {
      userId: String(userId),
      email,
      role,
      tokenVersion,
      isOwner: Boolean(flags.isOwner),
      isAdmin: Boolean(flags.isAdmin),
      isModerator: Boolean(flags.isModerator),
    },
    accessSecret,
    { expiresIn: '15m' }
  );
}

export function generateRefreshToken(
  userId: string,
  flags: JwtFlags,
  tokenVersion: number = 0,
  jti?: string
): string {
  return jwt.sign(
    {
      userId: String(userId),
      role: resolveRole(flags),
      tokenVersion,
      jti: jti || Date.now().toString(),
    },
    refreshSecret,
    { expiresIn: '7d' }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, refreshSecret) as RefreshTokenPayload;
}