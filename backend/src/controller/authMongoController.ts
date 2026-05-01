import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { generateToken } from '../services/jwt.service';
import { getMongoDb } from '../config/mongo';

const mapAuthUser = (user: any) => ({
  id: user._id.toString(),
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
    const db = await getMongoDb();
    const users = db.collection('users');

    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await users.insertOne({
      username: name,
      email,
      password: hashedPassword,
      profile_image: profileImage ?? null,
      is_owner: false,
      is_admin: false,
      is_moderator: false,
      is_banned: false,
      ban_reason: null,
      banned_at: null,
      created_at: new Date(),
    });

    const userId = result.insertedId.toString();
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
    const db = await getMongoDb();
    const users = db.collection('users');

    const user = await users.findOne({ email });
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

    const token = generateToken(user._id.toString(), user.email, {
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

  if (!authUser || authUser.userId !== userId) {
    return res.status(403).json({ error: 'Não autorizado' });
  }

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }

  if (profileImage !== undefined && profileImage !== null && typeof profileImage !== 'string') {
    return res.status(400).json({ error: 'Imagem de perfil inválida' });
  }

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const objectId = new ObjectId(userId);

    const user = await users.findOne({ _id: objectId });
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

    if (profileImage !== undefined) {
      updates.profile_image = profileImage;
    }

    if (newPassword) {
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    await users.updateOne({ _id: objectId }, { $set: updates });

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

  if (!authUser || authUser.userId !== userId) {
    return res.status(403).json({ error: 'Não autorizado' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Senha é obrigatória' });
  }

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const objectId = new ObjectId(userId);

    const user = await users.findOne({ _id: objectId });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Senha inválida' });
    }

    await users.deleteOne({ _id: objectId });

    return res.json({ message: 'Conta deletada com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao deletar conta' });
  }
};

export const listUsers = async (_req: Request, res: Response) => {
  try {
    const db = await getMongoDb();
    const users = db.collection('users');

    const rows = await users.find({}).sort({ created_at: -1 }).toArray();

    return res.json(
      rows.map((user) => ({
        id: user._id.toString(),
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

export const currentSession = async (req: Request, res: Response) => {
  const authUser = (req as any).user;

  if (!authUser?.userId) {
    return res.status(401).json({ error: 'Sessão inválida.' });
  }

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const objectId = new ObjectId(authUser.userId);

    const user = await users.findOne({ _id: objectId });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.username,
        email: user.email,
        isOwner: Boolean(user.is_owner),
        isAdmin: Boolean(user.is_admin),
        isModerator: Boolean(user.is_moderator),
        isBanned: Boolean(user.is_banned),
        profileImage: user.profile_image ?? null,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao recuperar sessão.' });
  }
};
