import jwt from 'jsonwebtoken';

const SECRET: string = process.env.JWT_SECRET ?? '';

if (!SECRET) {
  throw new Error('JWT_SECRET não configurado. Defina JWT_SECRET no ambiente.');
}

export type JwtFlags = {
  isOwner?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
};

export function generateToken(userId: string | number, email: string, flags: JwtFlags): string {
  return jwt.sign({ userId, email, ...flags }, SECRET, { expiresIn: '10d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET);
}