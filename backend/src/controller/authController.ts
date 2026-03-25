import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../services/jwt.service';

// Prisma removido. Use seu banco de dados aqui futuramente.

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  // Aqui você deve consultar o banco de dados para verificar se o email já existe
  // Exemplo mock:
  const existingUser = null; // Substitua por consulta real futuramente
  if (existingUser) {
    return res.status(409).json({ error: 'Email já cadastrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Aqui você deve criar o usuário no banco de dados
  // Exemplo mock:
  const user = { id: 1, name, email, password: hashedPassword };

  const token = generateToken(user.id, user.email);

  return res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Aqui você deve buscar o usuário no banco de dados
  // Exemplo mock:
  const user = { id: 1, name: 'Usuário Mock', email, password: await bcrypt.hash('senha123', 10) };
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = generateToken(user.id, user.email);

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
};