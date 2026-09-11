import { randomUUID, randomBytes, createHash } from 'crypto';
import { Request, Response, CookieOptions } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getMongoDb } from '../config/mongo';
import { sendPasswordResetEmail } from '../services/mailer.service';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JwtFlags } from '../services/jwt.service';
import { ensureRefreshTokenBlacklistIndexes, blacklistRefreshToken, isRefreshTokenBlacklisted, clearFailedLogins, getLoginLock, registerFailedLogin, LOGIN_LOCK_MINUTES } from '../services/auth.service';
import { decrypt, encrypt, hashForLookup } from '../services/encryption.service';
import { resolveRole, type AppRole } from '../middlewares/roleMiddleware';

const ACCESS_COOKIE_NAME = 'access_token';
const REFRESH_COOKIE_NAME = 'refresh_token';
const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const TOKEN_TTL_MINUTES = 15;

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  profileImage: z.string().trim().max(5_000_000).optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).max(128).optional(),
  profileImage: z.string().trim().max(5_000_000).optional().nullable(),
});

const deleteUserSchema = z.object({
  password: z.string().min(1),
});

const requestPasswordResetSchema = z.object({
  email: z.string().trim().email(),
});

const confirmPasswordResetSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().min(4).max(16),
  password: z.string().min(8).max(128),
});

const mapAuthUser = (user: any) => ({
  id: user._id.toString(),
  name: decrypt(user.username_encrypted ?? user.username) ?? '',
  email: decrypt(user.email_encrypted ?? user.email) ?? '',
  role: resolveRole({ role: user.role as AppRole | undefined, isOwner: user.is_owner, isAdmin: user.is_admin, isModerator: user.is_moderator }),
  isOwner: resolveRole({ role: user.role as AppRole | undefined, isOwner: user.is_owner, isAdmin: user.is_admin, isModerator: user.is_moderator }) === 'owner',
  isAdmin: ['owner', 'admin'].includes(resolveRole({ role: user.role as AppRole | undefined, isOwner: user.is_owner, isAdmin: user.is_admin, isModerator: user.is_moderator })),
  isModerator: ['owner', 'admin', 'moderator'].includes(resolveRole({ role: user.role as AppRole | undefined, isOwner: user.is_owner, isAdmin: user.is_admin, isModerator: user.is_moderator })),
  isBanned: Boolean(user.is_banned),
  profileImage: decrypt(user.profile_image_encrypted ?? user.profile_image) ?? null,
});

const normalizeEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '');
const getUserEmail = (user: any) => decrypt(user.email_encrypted ?? user.email) ?? '';
const getUserName = (user: any) => decrypt(user.username_encrypted ?? user.username) ?? '';
const getUserRole = (user: any): AppRole => resolveRole({ role: user.role, isOwner: user.is_owner, isAdmin: user.is_admin, isModerator: user.is_moderator });

const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/',
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...authCookieOptions,
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...authCookieOptions,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie(ACCESS_COOKIE_NAME, authCookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, authCookieOptions);
};

const getPasswordScore = (password: string) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

const commonPasswords = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111', '1234567', 'dragon',
  'baseball', 'abc123', 'football', 'monkey', 'letmein', 'shadow', 'master', '666666', 'qwertyuiop', '123321'
]);

const assertStrongPassword = (password: string) => {
  if (password.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.';
  }

  if (commonPasswords.has(password)) {
    return 'Senha muito comum. Escolha uma senha mais forte.';
  }

  if (getPasswordScore(password) < 3) {
    return 'Senha fraca. Use uma senha mais forte (maiúscula, minúscula, número e símbolo).';
  }

  return null;
};

const generateResetCode = () => randomBytes(3).toString('hex').toUpperCase();
const hashResetCode = (code: string) => createHash('sha256').update(code).digest('hex');

const getUserFlags = (user: any): JwtFlags => ({
  isOwner: getUserRole(user) === 'owner',
  isAdmin: ['owner', 'admin'].includes(getUserRole(user)),
  isModerator: ['owner', 'admin', 'moderator'].includes(getUserRole(user)),
});

const issueUserTokens = (user: any) => {
  const tokenVersion = Number(user.token_version ?? 0);
  const flags = getUserFlags(user);
  const userId = user._id.toString();

  const accessToken = generateAccessToken(userId, getUserEmail(user), flags, tokenVersion);
  const refreshJti = randomUUID();
  const refreshToken = generateRefreshToken(userId, flags, tokenVersion, refreshJti);

  return {
    accessToken,
    refreshToken,
    refreshJti,
  };
};

const getRefreshCookie = (req: Request) => {
  const cookieValue = (req as any).cookies?.[REFRESH_COOKIE_NAME];
  return typeof cookieValue === 'string' && cookieValue ? cookieValue : null;
};

const extractRefreshExpDate = (payload: any) => {
  if (typeof payload?.exp === 'number') {
    return new Date(payload.exp * 1000);
  }

  return new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);
};

export const register = async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos para cadastro.' });
  }

  const { name, email, password, profileImage } = parsed.data;
  const normalizedEmail = normalizeEmail(email);
  const passwordError = assertStrongPassword(password);

  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const db = await getMongoDb();
    const users = db.collection('users');

    const existingUser = await users.findOne({
      $or: [{ email_hash: hashForLookup(normalizedEmail) }, { email: normalizedEmail }],
    });
    if (existingUser) {
      return res.status(409).json({ error: 'Email já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await users.insertOne({
      username_encrypted: encrypt(name),
      email_encrypted: encrypt(normalizedEmail),
      email_hash: hashForLookup(normalizedEmail),
      password: hashedPassword,
      role: 'user',
      role_key_hash: null,
      profile_image_encrypted: encrypt(profileImage ?? null),
      token_version: 0,
      is_banned: false,
      ban_reason: null,
      banned_at: null,
      created_at: new Date(),
    });

    const user = await users.findOne({ _id: result.insertedId });
    if (!user) {
      return res.status(500).json({ error: 'Erro interno ao criar conta.' });
    }

    const { accessToken, refreshToken } = issueUserTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      token: accessToken,
      user: mapAuthUser(user),
    });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }
};

export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email e senha válidos são obrigatórios.' });
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const { password } = parsed.data;

  try {
    const db = await getMongoDb();
    const users = db.collection('users');

    const user = await users.findOne({
      $or: [{ email_hash: hashForLookup(normalizedEmail) }, { email: normalizedEmail }],
    });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const loginLockedUntil = getLoginLock(user as { failedAttempts?: number; loginLockedUntil?: Date });
    if (loginLockedUntil) {
      const retryAfterSeconds = Math.max(1, Math.ceil((loginLockedUntil.getTime() - Date.now()) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: `Muitas tentativas inválidas. Tente novamente em ${LOGIN_LOCK_MINUTES} minutos.`,
        retryAfter: loginLockedUntil.toISOString(),
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const attemptState = await registerFailedLogin(users, user._id);
      if (attemptState.loginLockedUntil) {
        const retryAfterSeconds = Math.max(1, Math.ceil((attemptState.loginLockedUntil.getTime() - Date.now()) / 1000));
        res.set('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
          error: `Limite de tentativas atingido. Tente novamente em ${LOGIN_LOCK_MINUTES} minutos.`,
          retryAfter: attemptState.loginLockedUntil.toISOString(),
        });
      }

      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: 'Sua conta está bloqueada.' });
    }

    await clearFailedLogins(users, user._id);
    const { accessToken, refreshToken } = issueUserTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      token: accessToken,
      user: mapAuthUser(user),
    });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
};

export const refreshSession = async (req: Request, res: Response) => {
  const refreshToken = getRefreshCookie(req);
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token não fornecido.' });
  }

  let decoded: any;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Refresh token inválido ou expirado.' });
  }

  try {
    const db = await getMongoDb();
    await ensureRefreshTokenBlacklistIndexes(db);

    const alreadyBlacklisted = await isRefreshTokenBlacklisted(db, refreshToken);
    if (alreadyBlacklisted) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Refresh token já revogado.' });
    }

    const users = db.collection('users');
    const user = await users.findOne({ _id: new ObjectId(decoded.userId) });

    if (!user || user.is_banned) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Sessão inválida.' });
    }

    const dbTokenVersion = Number(user.token_version ?? 0);
    if (dbTokenVersion !== Number(decoded.tokenVersion ?? 0)) {
      await blacklistRefreshToken(db, {
        token: refreshToken,
        userId: decoded.userId,
        jti: String(decoded.jti ?? 'unknown'),
        expiresAt: extractRefreshExpDate(decoded),
        reason: 'forced_revoke',
      });
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }

    await blacklistRefreshToken(db, {
      token: refreshToken,
      userId: decoded.userId,
      jti: String(decoded.jti ?? 'unknown'),
      expiresAt: extractRefreshExpDate(decoded),
      reason: 'rotation',
    });

    const { accessToken, refreshToken: nextRefreshToken } = issueUserTokens(user);
    setAuthCookies(res, accessToken, nextRefreshToken);

    return res.json({
      token: accessToken,
      user: mapAuthUser(user),
    });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao atualizar sessão.' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const refreshToken = getRefreshCookie(req);

  try {
    if (refreshToken) {
      const decoded: any = verifyRefreshToken(refreshToken);
      const db = await getMongoDb();
      await ensureRefreshTokenBlacklistIndexes(db);

      await blacklistRefreshToken(db, {
        token: refreshToken,
        userId: decoded.userId,
        jti: String(decoded.jti ?? 'unknown'),
        expiresAt: extractRefreshExpDate(decoded),
        reason: 'logout',
      });
    }
  } catch {
    // Ignore invalid/expired refresh token and continue logout flow.
  }

  clearAuthCookies(res);
  return res.status(200).json({ message: 'Logout realizado com sucesso.' });
};

export const updateUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const authUser = (req as any).user;

  if (!authUser || authUser.userId !== userId) {
    return res.status(403).json({ error: 'Não autorizado.' });
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos para atualização.' });
  }

  const { name, email, currentPassword, newPassword, profileImage } = parsed.data;
  const normalizedEmail = normalizeEmail(email);

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const objectId = new ObjectId(userId);

    const user = await users.findOne({ _id: objectId });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const duplicate = await users.findOne({
      $or: [{ email_hash: hashForLookup(normalizedEmail) }, { email: normalizedEmail }],
      _id: { $ne: objectId },
    });
    if (duplicate) {
      return res.status(409).json({ error: 'Email já está em uso por outra conta.' });
    }

    const updates: Record<string, unknown> = {
      username_encrypted: encrypt(name),
      email_encrypted: encrypt(normalizedEmail),
      email_hash: hashForLookup(normalizedEmail),
    };

    if (profileImage !== undefined) {
      updates.profile_image_encrypted = encrypt(profileImage);
    }

    let shouldBumpTokenVersion = false;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Senha atual é obrigatória para trocar a senha.' });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Senha atual inválida.' });
      }

      const isSame = await bcrypt.compare(newPassword, user.password);
      if (isSame) {
        return res.status(400).json({ error: 'A nova senha não pode ser igual à senha atual.' });
      }

      const passwordError = assertStrongPassword(newPassword);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      updates.password = await bcrypt.hash(newPassword, 12);
      shouldBumpTokenVersion = true;
    }

    const updateQuery: Record<string, unknown> = { $set: updates };
    if (shouldBumpTokenVersion) {
      updateQuery.$inc = { token_version: 1 };
    }

    await users.updateOne({ _id: objectId }, updateQuery);

    if (shouldBumpTokenVersion) {
      clearAuthCookies(res);
    }

    return res.json({
      message: shouldBumpTokenVersion
        ? 'Conta atualizada com sucesso. Faça login novamente.'
        : 'Conta atualizada com sucesso.',
      user: {
        ...mapAuthUser({
          ...user,
          ...updates,
          _id: objectId,
        }),
        name,
        email: normalizedEmail,
        profileImage: profileImage ?? decrypt(user.profile_image_encrypted ?? user.profile_image) ?? null,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao atualizar conta.' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const authUser = (req as any).user;

  if (!authUser || authUser.userId !== userId) {
    return res.status(403).json({ error: 'Não autorizado.' });
  }

  const parsed = deleteUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Senha é obrigatória.' });
  }

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const objectId = new ObjectId(userId);

    const user = await users.findOne({ _id: objectId });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const isPasswordValid = await bcrypt.compare(parsed.data.password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Senha inválida.' });
    }

    await users.deleteOne({ _id: objectId });
    clearAuthCookies(res);

    return res.json({ message: 'Conta deletada com sucesso.' });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao deletar conta.' });
  }
};

export const listUsers = async (_req: Request, res: Response) => {
  try {
    const db = await getMongoDb();
    const users = db.collection('users');

    const rows = await users.find({}).sort({ created_at: -1 }).toArray();

    return res.json(rows.map(mapAuthUser));
  } catch {
    return res.status(500).json({ error: 'Erro interno ao listar usuários.' });
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

    return res.json({ user: mapAuthUser(user) });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao recuperar sessão.' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const parsed = requestPasswordResetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  const email = normalizeEmail(parsed.data.email);

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const resetTokens = db.collection('password_reset_tokens');

    await resetTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    const user = await users.findOne({
      $or: [{ email_hash: hashForLookup(email) }, { email }],
    });
    if (!user) {
      return res.status(404).json({ error: 'Email não encontrado.' });
    }

    await resetTokens.deleteMany({ userId: user._id.toString() });

    const resetCode = generateResetCode();
    const resetCodeHash = hashResetCode(resetCode);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    await resetTokens.insertOne({
      userId: user._id.toString(),
      emailHash: hashForLookup(email),
      codeHash: resetCodeHash,
      expiresAt,
      createdAt: new Date(),
      usedAt: null,
    });

    const publicBaseUrl = process.env.APP_PUBLIC_URL?.replace(/\/$/, '') ?? 'https://toolora.com.br';
    const resetUrl = `${publicBaseUrl}/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(resetCode)}`;

    try {
      await sendPasswordResetEmail({
        to: getUserEmail(user),
        name: getUserName(user),
        code: resetCode,
        resetUrl,
        expiresInMinutes: TOKEN_TTL_MINUTES,
      });
    } catch {
      await resetTokens.deleteMany({ userId: user._id.toString(), codeHash: resetCodeHash });
      return res.status(500).json({ error: 'Não foi possível enviar o email de recuperação.' });
    }

    return res.json({
      message: 'Código de recuperação gerado com sucesso.',
      resetCode,
      resetUrl,
      expiresInMinutes: TOKEN_TTL_MINUTES,
    });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao gerar recuperação de senha.' });
  }
};

export const confirmPasswordReset = async (req: Request, res: Response) => {
  const parsed = confirmPasswordResetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Dados inválidos para redefinição.' });
  }

  const email = normalizeEmail(parsed.data.email);
  const code = parsed.data.code.trim().toUpperCase();
  const newPassword = parsed.data.password;

  const passwordError = assertStrongPassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const resetTokens = db.collection('password_reset_tokens');

    const token = await resetTokens.findOne({
      emailHash: hashForLookup(email),
      codeHash: hashResetCode(code),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!token) {
      return res.status(400).json({ error: 'Código inválido ou expirado.' });
    }

    const user = await users.findOne({ _id: new ObjectId(token.userId) });
    if (!user || getUserEmail(user) !== email) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({ error: 'A nova senha não pode ser igual à senha anterior.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await users.updateOne(
      { _id: new ObjectId(token.userId) },
      { $set: { password: hashedPassword }, $inc: { token_version: 1 } }
    );

    await resetTokens.updateOne(
      { _id: token._id },
      { $set: { usedAt: new Date() } }
    );

    return res.json({ message: 'Senha redefinida com sucesso.' });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao redefinir senha.' });
  }
};
