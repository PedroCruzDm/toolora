import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error('JWT_SECRET não configurado. Defina JWT_SECRET no ambiente.');
}

export function generateToken(userId: number, email: string, isAdmin: boolean): string {
  return jwt.sign({ userId, email, isAdmin }, SECRET, { expiresIn: '10d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET);
}