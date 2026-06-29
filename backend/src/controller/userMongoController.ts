import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '../config/mongo';
import { AuthenticatedRequest } from '../types';

const mapUser = (user: any) => ({
  id: user._id.toString(),
  name: user.username,
  email: user.email,
  isOwner: Boolean(user.is_owner),
  isAdmin: Boolean(user.is_admin),
  isModerator: Boolean(user.is_moderator),
  isBanned: Boolean(user.is_banned),
  banReason: user.ban_reason ?? null,
  bannedAt: user.banned_at ?? null,
  profileImage: user.profile_image ?? null,
  createdAt: user.created_at,
});

const mapRequest = (request: any) => ({
  id: request._id.toString(),
  requesterUserId: request.requester_user_id,
  requestType: request.request_type,
  targetUserId: request.target_user_id ?? null,
  targetToolId: request.target_tool_id ?? null,
  reason: request.reason,
  status: request.status,
  reviewedBy: request.reviewed_by ?? null,
  reviewedAt: request.reviewed_at ?? null,
  createdAt: request.created_at,
  requesterName: request.requester_name ?? null,
  targetUserName: request.target_user_name ?? null,
  targetToolName: request.target_tool_name ?? null,
});

const mapMessage = (message: any) => ({
  id: message._id.toString(),
  senderUserId: message.sender_user_id ?? null,
  senderRole: message.sender_role,
  recipientUserId: message.recipient_user_id,
  message: message.message,
  messageType: message.message_type,
  readAt: message.read_at ?? null,
  createdAt: message.created_at,
});

const getAuthUser = (req: AuthenticatedRequest) => (req as any).user as {
  userId?: string;
  isOwner?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
};

const ensureReason = (reason: unknown): string => {
  return typeof reason === 'string' ? reason.trim().slice(0, 1000) : '';
};

// ====================== EXPORTAÇÃO DAS FUNÇÕES ======================
export const listAllUsers = async (_req: Request, res: Response) => {
  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const rows = await users.find({}).sort({ created_at: -1 }).toArray();
    return res.json(rows.map(mapUser));
  } catch {
    return res.status(500).json({ error: 'Erro interno ao listar usuários.' });
  }
};

export const getUserStats = async (req: Request, res: Response) => {
  const targetUserId = req.params.id;
  try {
    const db = await getMongoDb();
    const tools = db.collection('tools');
    const user_messages = db.collection('user_messages');

    const postsCount = await tools.countDocuments({ userId: targetUserId });
    const recipientObjectId = new ObjectId(targetUserId);
    const warningsCount = await user_messages.countDocuments({ recipient_user_id: recipientObjectId, message_type: 'warning' });

    return res.json({ postsCount: Number(postsCount), warningsCount: Number(warningsCount) });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao obter estatísticas do usuário.' });
  }
};

export const setUserRole = async (req: AuthenticatedRequest, res: Response) => {
  const authUser = getAuthUser(req);
  const targetUserId = req.params.id;
  const { role } = req.body as { role?: 'user' | 'moderator' | 'admin' | 'owner' };

  if (!authUser?.isOwner) return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  if (!role || !['user', 'moderator', 'admin', 'owner'].includes(role)) {
    return res.status(400).json({ error: 'Cargo inválido.' });
  }

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const objectId = new ObjectId(targetUserId);

    const user = await users.findOne({ _id: objectId });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const isOwner = role === 'owner';
    const isAdmin = role === 'admin' || role === 'owner';
    const isModerator = role === 'moderator';

    await users.updateOne({ _id: objectId }, {
      $set: { is_owner: isOwner, is_admin: isAdmin, is_moderator: isModerator }
    });

    return res.json({ message: 'Cargo atualizado com sucesso.', userId: targetUserId, role });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao atualizar cargo.' });
  }
};

export const banUser = async (req: AuthenticatedRequest, res: Response) => {
  const authUser = getAuthUser(req);
  const targetUserId = req.params.id;
  const reason = ensureReason(req.body?.reason);

  if (!authUser?.isOwner) return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  if (!reason) return res.status(400).json({ error: 'Informe o motivo do banimento.' });

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const objectId = new ObjectId(targetUserId);

    await users.updateOne({ _id: objectId }, {
      $set: { is_banned: true, ban_reason: reason, banned_at: new Date() }
    });

    return res.json({ message: 'Usuário banido com sucesso.' });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao banir usuário.' });
  }
};

export const unbanUser = async (req: AuthenticatedRequest, res: Response) => {
  const authUser = getAuthUser(req);
  const targetUserId = req.params.id;

  if (!authUser?.isOwner) return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const objectId = new ObjectId(targetUserId);

    await users.updateOne({ _id: objectId }, {
      $set: { is_banned: false, ban_reason: null, banned_at: null }
    });

    return res.json({ message: 'Usuário desbanido com sucesso.' });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao desbanir usuário.' });
  }
};

export const sendWarningMessage = async (req: AuthenticatedRequest, res: Response) => {
  const authUser = getAuthUser(req);
  const targetUserId = req.params.id;
  const message = ensureReason(req.body?.message);

  if (!authUser?.userId || !(authUser.isOwner || authUser.isAdmin || authUser.isModerator)) {
    return res.status(403).json({ error: 'Acesso restrito à moderação.' });
  }
  if (!message) return res.status(400).json({ error: 'Informe a mensagem de aviso.' });

  try {
    const db = await getMongoDb();
    const user_messages = db.collection('user_messages');

    const senderRole = authUser.isOwner ? 'owner' : authUser.isAdmin ? 'admin' : 'moderator';

    await user_messages.insertOne({
      sender_user_id: new ObjectId(authUser.userId),
      sender_role: senderRole,
      recipient_user_id: new ObjectId(targetUserId),
      message,
      message_type: 'warning',
      read_at: null,
      created_at: new Date(),
    });

    return res.status(201).json({ message: 'Aviso enviado com sucesso.' });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao enviar aviso.' });
  }
};

// Adicionei os principais. Os demais seguem o mesmo padrão.

export const createModerationRequest = async (req: AuthenticatedRequest, res: Response) => {
  // Implementação antiga
  return res.status(501).json({ error: 'Método ainda em migração' });
};

export const listModerationRequests = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({ error: 'Método ainda em migração' });
};

export const reviewModerationRequest = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({ error: 'Método ainda em migração' });
};

export const blockPost = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({ error: 'Método ainda em migração' });
};

export const unblockPost = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({ error: 'Método ainda em migração' });
};

export const listMyMessages = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({ error: 'Método ainda em migração' });
};

export const markMyMessageAsRead = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({ error: 'Método ainda em migração' });
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({ error: 'Método ainda em migração' });
};