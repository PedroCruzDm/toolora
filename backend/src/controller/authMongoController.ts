import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { generateToken } from '../services/jwt.service';
import { getMongoDb } from '../config/mongo';
import { sendPasswordResetEmail } from '../services/mailer.service';

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

const TOKEN_TTL_MINUTES = 15;

const normalizeEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const generateResetCode = () => randomBytes(3).toString('hex').toUpperCase();

const hashResetCode = (code: string) => createHash('sha256').update(code).digest('hex');

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

export const requestPasswordReset = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório.' });
  }

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const resetTokens = db.collection('password_reset_tokens');

    await resetTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Email não encontrado.' });
    }

    await resetTokens.deleteMany({ userId: user._id.toString() });

    const resetCode = generateResetCode();
    const resetCodeHash = hashResetCode(resetCode);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    await resetTokens.insertOne({
      userId: user._id.toString(),
      email: user.email,
      codeHash: resetCodeHash,
      expiresAt,
      createdAt: new Date(),
      usedAt: null,
    });

    const publicBaseUrl = process.env.APP_PUBLIC_URL?.replace(/\/$/, '') ?? 'http://localhost:5173';
    const resetUrl = `${publicBaseUrl}/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(resetCode)}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.username,
        code: resetCode,
        resetUrl,
        expiresInMinutes: TOKEN_TTL_MINUTES,
      });
    } catch (emailError) {
      await resetTokens.deleteMany({ userId: user._id.toString(), codeHash: resetCodeHash });
      return res.status(500).json({ error: 'Não foi possível enviar o email de recuperação.' });
    }

    return res.json({
      message: 'Código de recuperação gerado com sucesso.',
      resetCode,
      resetUrl,
      expiresInMinutes: TOKEN_TTL_MINUTES,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao gerar recuperação de senha.' });
  }
};

export const confirmPasswordReset = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
  const newPassword = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, código e nova senha são obrigatórios.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const resetTokens = db.collection('password_reset_tokens');

    const token = await resetTokens.findOne({
      email,
      codeHash: hashResetCode(code),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!token) {
      return res.status(400).json({ error: 'Código inválido ou expirado.' });
    }

    const user = await users.findOne({ _id: new ObjectId(token.userId) });
    if (!user || user.email !== email) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await users.updateOne(
      { _id: new ObjectId(token.userId) },
      { $set: { password: hashedPassword } }
    );

    await resetTokens.updateOne(
      { _id: token._id },
      { $set: { usedAt: new Date() } }
    );

    return res.json({ message: 'Senha redefinida com sucesso.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao redefinir senha.' });
  }
};
