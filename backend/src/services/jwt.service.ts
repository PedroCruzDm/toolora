import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-2026';

export function generateToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, SECRET, { expiresIn: '10d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET);
}