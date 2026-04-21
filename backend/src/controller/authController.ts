import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../services/jwt.service';
import pool from '../config/db';

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    const userId = (result as any).insertId as number;
    const token = generateToken(userId, email, false);

    return res.status(201).json({
      token,
      user: { id: userId, name, email, isAdmin: false },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao criar conta' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, password, is_admin FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    const user = Array.isArray(rows) ? (rows[0] as any) : null;
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = generateToken(user.id, user.email, Boolean(user.is_admin));

    return res.json({
      token,
      user: { id: user.id, name: user.username, email: user.email, isAdmin: Boolean(user.is_admin) },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao fazer login' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const { name, email, currentPassword, newPassword } = req.body;
  const authUser = (req as any).user;

  if (!authUser || authUser.userId !== parseInt(userId)) {
    return res.status(403).json({ error: 'Não autorizado' });
  }

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }

  try {
    const [userRows] = await pool.execute(
      'SELECT password FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    const user = Array.isArray(userRows) ? (userRows[0] as any) : null;
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Senha atual é obrigatória' });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Senha atual inválida' });
      }
    }

    const updates: any = { username: name, email };
    const params: any[] = [name, email];

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.password = hashedPassword;
      params.push(hashedPassword);
    }

    params.push(userId);

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const updateQuery = `UPDATE users SET ${setClause} WHERE id = ?`;

    await pool.execute(updateQuery, params);

    return res.json({
      message: 'Conta atualizada com sucesso',
      user: { id: userId, name, email },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao atualizar conta' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const { password } = req.body;
  const authUser = (req as any).user;

  if (!authUser || authUser.userId !== parseInt(userId)) {
    return res.status(403).json({ error: 'Não autorizado' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Senha é obrigatória' });
  }

  try {
    const [userRows] = await pool.execute(
      'SELECT password FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    const user = Array.isArray(userRows) ? (userRows[0] as any) : null;
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Senha inválida' });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    return res.json({ message: 'Conta deletada com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao deletar conta' });
  }
};

export const listUsers = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC'
    );

    return res.json(
      (rows as any[]).map((user) => ({
        id: user.id,
        name: user.username,
        email: user.email,
        isAdmin: Boolean(user.is_admin),
        createdAt: user.created_at,
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao listar usuários' });
  }
};