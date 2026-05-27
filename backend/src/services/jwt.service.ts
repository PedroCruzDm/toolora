import jwt from 'jsonwebtoken';

const ACCESS_SECRET: string = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? '';
const REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? '';
const ACCESS_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'];
const REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('Segredos JWT não configurados. Defina JWT_SECRET (ou JWT_ACCESS_SECRET/JWT_REFRESH_SECRET).');
}

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
};

export type RefreshTokenPayload = {
  userId: string;
  role: AppRole;
  tokenVersion: number;
  jti: string;
};

const resolveRole = (flags: JwtFlags): AppRole => {
  if (flags.isOwner) return 'owner';
  if (flags.isAdmin) return 'admin';
  if (flags.isModerator) return 'moderator';
  return 'user';
};

export function generateAccessToken(
  userId: string | number,
  email: string,
  flags: JwtFlags,
  tokenVersion: number
): string {
  const role = resolveRole(flags);

  return jwt.sign(
    {
      userId: String(userId),
      email,
      role,
      tokenVersion,
      isOwner: role === 'owner',
      isAdmin: role === 'owner' || role === 'admin',
      isModerator: role === 'moderator',
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

export function generateRefreshToken(
  userId: string | number,
  flags: JwtFlags,
  tokenVersion: number,
  jti: string
): string {
  const role = resolveRole(flags);

  return jwt.sign(
    {
      userId: String(userId),
      role,
      tokenVersion,
      jti,
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}