import { Request, Response } from 'express';
import pool from '../config/db';

const mapUser = (user: any) => ({
  id: user.id,
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
  id: request.id,
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
  id: message.id,
  senderUserId: message.sender_user_id ?? null,
  senderRole: message.sender_role,
  recipientUserId: message.recipient_user_id,
  message: message.message,
  messageType: message.message_type,
  readAt: message.read_at ?? null,
  createdAt: message.created_at,
});

const getAuthUser = (req: Request) => (req as any).user as {
  userId?: number;
  isOwner?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
};

const ensureReason = (reason: unknown) => {
  return typeof reason === 'string' ? reason.trim().slice(0, 1000) : '';
};

export const listAllUsers = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, is_owner, is_admin, is_moderator, is_banned, ban_reason, banned_at, profile_image, created_at FROM users ORDER BY created_at DESC'
    );

    return res.json((rows as any[]).map(mapUser));
  } catch {
    return res.status(500).json({ error: 'Erro interno ao listar usuários.' });
  }
};

export const setUserRole = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const targetUserId = Number(req.params.id);
  const { role } = req.body as { role?: 'user' | 'moderator' | 'admin' | 'owner' };

  if (!authUser?.isOwner) {
    return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  }

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ error: 'Usuário inválido.' });
  }

  if (!role || !['user', 'moderator', 'admin', 'owner'].includes(role)) {
    return res.status(400).json({ error: 'Cargo inválido.' });
  }

  const [rows] = await pool.execute(
    'SELECT id FROM users WHERE id = ? LIMIT 1',
    [targetUserId]
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || role === 'owner';
  const isModerator = role === 'moderator';

  await pool.execute(
    'UPDATE users SET is_owner = ?, is_admin = ?, is_moderator = ? WHERE id = ?',
    [isOwner, isAdmin, isModerator, targetUserId]
  );

  return res.json({
    message: 'Cargo atualizado com sucesso.',
    userId: targetUserId,
    role,
  });
};

export const banUser = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const targetUserId = Number(req.params.id);
  const reason = ensureReason(req.body?.reason);

  if (!authUser?.isOwner) {
    return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  }

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ error: 'Usuário inválido.' });
  }

  if (!reason) {
    return res.status(400).json({ error: 'Informe o motivo do banimento.' });
  }

  await pool.execute(
    'UPDATE users SET is_banned = TRUE, ban_reason = ?, banned_at = NOW() WHERE id = ?',
    [reason, targetUserId]
  );

  return res.json({ message: 'Usuário banido com sucesso.' });
};

export const unbanUser = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const targetUserId = Number(req.params.id);

  if (!authUser?.isOwner) {
    return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  }

  await pool.execute(
    'UPDATE users SET is_banned = FALSE, ban_reason = NULL, banned_at = NULL WHERE id = ?',
    [targetUserId]
  );

  return res.json({ message: 'Usuário desbanido com sucesso.' });
};

export const sendWarningMessage = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const targetUserId = Number(req.params.id);
  const message = ensureReason(req.body?.message);

  if (!authUser?.userId || !(authUser.isOwner || authUser.isAdmin || authUser.isModerator)) {
    return res.status(403).json({ error: 'Acesso restrito à moderação.' });
  }

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ error: 'Usuário inválido.' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Informe a mensagem de aviso.' });
  }

  const senderRole = authUser.isOwner ? 'owner' : authUser.isAdmin ? 'admin' : 'moderator';

  await pool.execute(
    'INSERT INTO user_messages (sender_user_id, sender_role, recipient_user_id, message, message_type) VALUES (?, ?, ?, ?, ?)',
    [authUser.userId, senderRole, targetUserId, message, 'warning']
  );

  return res.status(201).json({ message: 'Aviso enviado com sucesso.' });
};

export const createModerationRequest = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const { requestType, targetUserId, targetToolId, reason } = req.body as {
    requestType?: 'ban_user' | 'ban_post';
    targetUserId?: number;
    targetToolId?: number;
    reason?: string;
  };

  if (!authUser?.userId || !(authUser.isOwner || authUser.isAdmin || authUser.isModerator)) {
    return res.status(403).json({ error: 'Acesso restrito à moderação.' });
  }

  if (authUser.isOwner) {
    return res.status(400).json({ error: 'O dono pode agir diretamente sem solicitar banimento.' });
  }

  if (!requestType || !['ban_user', 'ban_post'].includes(requestType)) {
    return res.status(400).json({ error: 'Tipo de solicitação inválido.' });
  }

  const normalizedReason = ensureReason(reason);
  if (!normalizedReason) {
    return res.status(400).json({ error: 'Informe o motivo da solicitação.' });
  }

  if (requestType === 'ban_user') {
    if (!targetUserId || !Number.isInteger(Number(targetUserId))) {
      return res.status(400).json({ error: 'Informe o usuário alvo.' });
    }
  }

  if (requestType === 'ban_post') {
    if (!targetToolId || !Number.isInteger(Number(targetToolId))) {
      return res.status(400).json({ error: 'Informe o post alvo.' });
    }
  }

  const [result] = await pool.execute(
    'INSERT INTO moderation_requests (requester_user_id, request_type, target_user_id, target_tool_id, reason) VALUES (?, ?, ?, ?, ?)',
    [authUser.userId, requestType, targetUserId ?? null, targetToolId ?? null, normalizedReason]
  );

  return res.status(201).json({
    message: 'Solicitação enviada para o dono do sistema.',
    requestId: (result as any).insertId,
  });
};

export const listModerationRequests = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);

  if (!authUser?.userId || !(authUser.isOwner || authUser.isAdmin || authUser.isModerator)) {
    return res.status(403).json({ error: 'Acesso restrito à moderação.' });
  }

  try {
    const isPrivilegedReviewer = Boolean(authUser.isOwner || authUser.isAdmin);

    const [rows] = await pool.execute(
      `SELECT mr.id, mr.requester_user_id, mr.request_type, mr.target_user_id, mr.target_tool_id, mr.reason, mr.status, mr.reviewed_by, mr.reviewed_at, mr.created_at,
              ru.username AS requester_name,
              tu.username AS target_user_name,
              tt.name AS target_tool_name
       FROM moderation_requests mr
       JOIN users ru ON ru.id = mr.requester_user_id
       LEFT JOIN users tu ON tu.id = mr.target_user_id
       LEFT JOIN tools tt ON tt.id = mr.target_tool_id
       ${isPrivilegedReviewer ? '' : 'WHERE mr.requester_user_id = ?'}
       ORDER BY mr.created_at DESC`,
      isPrivilegedReviewer ? [] : [authUser.userId]
    );

    return res.json((rows as any[]).map(mapRequest));
  } catch {
    return res.status(500).json({ error: 'Erro interno ao listar solicitações.' });
  }
};

export const reviewModerationRequest = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const requestId = Number(req.params.id);
  const action = req.params.action as 'approve' | 'reject';

  if (!authUser?.isOwner || !authUser.userId) {
    return res.status(403).json({ error: 'Apenas o dono do sistema pode revisar solicitações de banimento.' });
  }

  const reviewerUserId = authUser.userId;

  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ error: 'Solicitação inválida.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [requestRows] = await connection.execute(
      'SELECT * FROM moderation_requests WHERE id = ? LIMIT 1',
      [requestId]
    );

    const request = Array.isArray(requestRows) ? (requestRows[0] as any) : null;
    if (!request) {
      await connection.rollback();
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    if (request.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: 'Esta solicitação já foi revisada.' });
    }

    if (action === 'approve') {
      if (request.request_type === 'ban_user' && request.target_user_id) {
        await connection.execute(
          'UPDATE users SET is_banned = TRUE, ban_reason = ?, banned_at = NOW() WHERE id = ?',
          [request.reason, request.target_user_id]
        );
      }

      if (request.request_type === 'ban_post' && request.target_tool_id) {
        await connection.execute(
          'UPDATE tools SET blocked_by_owner = TRUE, blocked_reason = ?, blocked_at = NOW() WHERE id = ?',
          [request.reason, request.target_tool_id]
        );
      }
    }

    await connection.execute(
      'UPDATE moderation_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [action === 'approve' ? 'approved' : 'rejected', reviewerUserId, requestId]
    );

    await connection.commit();

    return res.json({
      message: action === 'approve' ? 'Solicitação aprovada.' : 'Solicitação rejeitada.',
    });
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Erro interno ao revisar solicitação.' });
  } finally {
    connection.release();
  }
};

export const blockPost = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const toolId = Number(req.params.id);
  const reason = ensureReason(req.body?.reason);

  if (!authUser?.isOwner) {
    return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  }

  if (!Number.isInteger(toolId) || toolId <= 0) {
    return res.status(400).json({ error: 'Post inválido.' });
  }

  await pool.execute(
    'UPDATE tools SET blocked_by_owner = TRUE, blocked_reason = ?, blocked_at = NOW() WHERE id = ?',
    [reason || 'Bloqueado pelo dono do sistema.', toolId]
  );

  return res.json({ message: 'Post bloqueado com sucesso.' });
};

export const unblockPost = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const toolId = Number(req.params.id);

  if (!authUser?.isOwner) {
    return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  }

  await pool.execute(
    'UPDATE tools SET blocked_by_owner = FALSE, blocked_reason = NULL, blocked_at = NULL WHERE id = ?',
    [toolId]
  );

  return res.json({ message: 'Post desbloqueado com sucesso.' });
};

export const listMyMessages = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);

  if (!authUser?.userId) {
    return res.status(403).json({ error: 'Não autorizado.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, sender_user_id, sender_role, recipient_user_id, message, message_type, read_at, created_at FROM user_messages WHERE recipient_user_id = ? ORDER BY created_at DESC',
      [authUser.userId]
    );

    return res.json((rows as any[]).map(mapMessage));
  } catch {
    return res.status(500).json({ error: 'Erro interno ao listar mensagens.' });
  }
};