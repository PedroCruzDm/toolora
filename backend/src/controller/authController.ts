import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../services/jwt.service';
import pool from '../config/db';

const mapAuthUser = (user: any) => ({
  id: user.id,
  name: user.username,
  email: user.email,
  isOwner: Boolean(user.is_owner),
  isAdmin: Boolean(user.is_admin),
  isModerator: Boolean(user.is_moderator),
  isBanned: Boolean(user.is_banned),
  profileImage: user.profile_image ?? null,
});

export const register = async (req: Request, res: Response) => {
  const { name, email, password, profileImage } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  if (profileImage && typeof profileImage !== 'string') {
    return res.status(400).json({ error: 'Imagem de perfil inválida' });
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
      'INSERT INTO users (username, email, password, profile_image) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, profileImage ?? null]
    );

    const userId = (result as any).insertId as number;
    const token = generateToken(userId, email, { isOwner: false, isAdmin: false, isModerator: false });

    return res.status(201).json({
      token,
      user: { id: userId, name, email, isOwner: false, isAdmin: false, isModerator: false, isBanned: false, profileImage: profileImage ?? null },
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
      'SELECT id, username, email, password, is_owner, is_admin, is_moderator, is_banned, profile_image FROM users WHERE email = ? LIMIT 1',
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

    if (user.is_banned) {
      return res.status(403).json({ error: 'Sua conta está bloqueada.' });
    }

    const token = generateToken(user.id, user.email, {
      isOwner: Boolean(user.is_owner),
      isAdmin: Boolean(user.is_admin),
      isModerator: Boolean(user.is_moderator),
    });

    return res.json({
      token,
      user: mapAuthUser(user),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao fazer login' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const { name, email, currentPassword, newPassword, profileImage } = req.body;
  const authUser = (req as any).user;

  if (!authUser || authUser.userId !== parseInt(userId)) {
    return res.status(403).json({ error: 'Não autorizado' });
  }

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }

  if (profileImage !== undefined && profileImage !== null && typeof profileImage !== 'string') {
    return res.status(400).json({ error: 'Imagem de perfil inválida' });
  }

  try {
    const [userRows] = await pool.execute(
      'SELECT password, profile_image, is_owner, is_admin, is_moderator, is_banned FROM users WHERE id = ? LIMIT 1',
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

    if (profileImage !== undefined) {
      updates.profile_image = profileImage;
      params.push(profileImage);
    }

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
      user: {
        id: userId,
        name,
        email,
        isOwner: Boolean(user.is_owner),
        isAdmin: Boolean(user.is_admin),
        isModerator: Boolean(user.is_moderator),
        isBanned: Boolean(user.is_banned),
        profileImage: profileImage ?? (user.profile_image ?? null),
      },
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
      'SELECT id, username, email, is_owner, is_admin, is_moderator, is_banned, profile_image, created_at FROM users ORDER BY created_at DESC'
    );

    return res.json(
      (rows as any[]).map((user) => ({
        id: user.id,
        name: user.username,
        email: user.email,
        isOwner: Boolean(user.is_owner),
        isAdmin: Boolean(user.is_admin),
        isModerator: Boolean(user.is_moderator),
        isBanned: Boolean(user.is_banned),
        profileImage: user.profile_image ?? null,
        createdAt: user.created_at,
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao listar usuários' });
  }
};