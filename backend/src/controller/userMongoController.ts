import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '../config/mongo';

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

const getAuthUser = (req: Request) => (req as any).user as {
  userId?: string;
  isOwner?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
};

const ensureReason = (reason: unknown) => {
  return typeof reason === 'string' ? reason.trim().slice(0, 1000) : '';
};

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

    // Count posts (tools) authored by this user. Tools store userId as the auth token value (string),
    // so we query by the raw string id.
    const postsCount = await tools.countDocuments({ userId: targetUserId });

    // Count warning messages where recipient_user_id is this user ObjectId
    const recipientObjectId = new ObjectId(targetUserId);
    const warningsCount = await user_messages.countDocuments({ recipient_user_id: recipientObjectId, message_type: 'warning' });

    return res.json({ postsCount: Number(postsCount), warningsCount: Number(warningsCount) });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao obter estatísticas do usuário.' });
  }
};

export const setUserRole = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const targetUserId = req.params.id;
  const { role } = req.body as { role?: 'user' | 'moderator' | 'admin' | 'owner' };

  if (!authUser?.isOwner) {
    return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  }

  if (!role || !['user', 'moderator', 'admin', 'owner'].includes(role)) {
    return res.status(400).json({ error: 'Cargo inválido.' });
  }

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const objectId = new ObjectId(targetUserId);

    const user = await users.findOne({ _id: objectId });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const isOwner = role === 'owner';
    const isAdmin = role === 'admin' || role === 'owner';
    const isModerator = role === 'moderator';

    await users.updateOne({ _id: objectId }, {
      $set: {
        is_owner: isOwner,
        is_admin: isAdmin,
        is_moderator: isModerator,
      }
    });

    return res.json({
      message: 'Cargo atualizado com sucesso.',
      userId: targetUserId,
      role,
    });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao atualizar cargo.' });
  }
};

export const banUser = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const targetUserId = req.params.id;
  const reason = ensureReason(req.body?.reason);

  if (!authUser?.isOwner) {
    return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  }

  if (!reason) {
    return res.status(400).json({ error: 'Informe o motivo do banimento.' });
  }

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const objectId = new ObjectId(targetUserId);

    await users.updateOne({ _id: objectId }, {
      $set: {
        is_banned: true,
        ban_reason: reason,
        banned_at: new Date(),
      }
    });

    return res.json({ message: 'Usuário banido com sucesso.' });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao banir usuário.' });
  }
};

export const unbanUser = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const targetUserId = req.params.id;

  if (!authUser?.isOwner) {
    return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  }

  try {
    const db = await getMongoDb();
    const users = db.collection('users');
    const objectId = new ObjectId(targetUserId);

    await users.updateOne({ _id: objectId }, {
      $set: {
        is_banned: false,
        ban_reason: null,
        banned_at: null,
      }
    });

    return res.json({ message: 'Usuário desbanido com sucesso.' });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao desbanir usuário.' });
  }
};

export const sendWarningMessage = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const targetUserId = req.params.id;
  const message = ensureReason(req.body?.message);

  if (!authUser?.userId || !(authUser.isOwner || authUser.isAdmin || authUser.isModerator)) {
    return res.status(403).json({ error: 'Acesso restrito à moderação.' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Informe a mensagem de aviso.' });
  }

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

export const createModerationRequest = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const { requestType, targetUserId, targetToolId, reason } = req.body as {
    requestType?: 'ban_user' | 'ban_post';
    targetUserId?: string;
    targetToolId?: string;
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
    if (!targetUserId) {
      return res.status(400).json({ error: 'Informe o usuário alvo.' });
    }
  }

  if (requestType === 'ban_post') {
    if (!targetToolId) {
      return res.status(400).json({ error: 'Informe o post alvo.' });
    }
  }

  try {
    const db = await getMongoDb();
    const moderation_requests = db.collection('moderation_requests');
    const users = db.collection('users');
    const user_messages = db.collection('user_messages');

    const result = await moderation_requests.insertOne({
      requester_user_id: new ObjectId(authUser.userId),
      request_type: requestType,
      target_user_id: targetUserId ? new ObjectId(targetUserId) : null,
      target_tool_id: targetToolId ? Number(targetToolId) : null,
      reason: normalizedReason,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date(),
    });

    // Notify every owner so they can review moderator/admin requests in their inbox.
    const messageText =
      requestType === 'ban_user'
        ? `Nova solicitacao: banir usuario #${targetUserId}. Motivo: ${normalizedReason}`
        : `Nova solicitacao: bloquear post #${targetToolId}. Motivo: ${normalizedReason}`;

    const ownerUsers = await users.find({ is_owner: true }).toArray();
    if (ownerUsers.length > 0) {
      const senderRole = authUser.isAdmin ? 'admin' : 'moderator';
      const messages = ownerUsers.map(owner => ({
        sender_user_id: new ObjectId(authUser.userId),
        sender_role: senderRole,
        recipient_user_id: owner._id,
        message: messageText,
        message_type: 'info',
        read_at: null,
        created_at: new Date(),
      }));
      await user_messages.insertMany(messages);
    }

    return res.status(201).json({
      message: 'Solicitação enviada para o dono do sistema.',
      requestId: result.insertedId.toString(),
    });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao criar solicitação de moderação.' });
  }
};

export const listModerationRequests = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);

  if (!authUser?.userId || !(authUser.isOwner || authUser.isAdmin || authUser.isModerator)) {
    return res.status(403).json({ error: 'Acesso restrito à moderação.' });
  }

  try {
    const db = await getMongoDb();
    const moderation_requests = db.collection('moderation_requests');
    const users = db.collection('users');

    const isPrivilegedReviewer = Boolean(authUser.isOwner || authUser.isAdmin);

    const filter = isPrivilegedReviewer ? {} : { requester_user_id: new ObjectId(authUser.userId) };

    const rows = await moderation_requests
      .find(filter)
      .sort({ created_at: -1 })
      .toArray();

    // Enrich with requester and target names
    const enriched = await Promise.all(
      rows.map(async (request) => {
        const requesterUser = await users.findOne({ _id: request.requester_user_id });
        const targetUser = request.target_user_id
          ? await users.findOne({ _id: request.target_user_id })
          : null;
        const targetTool = request.target_tool_id
          ? await db.collection('tools').findOne({ id: request.target_tool_id })
          : null;

        return {
          ...request,
          requester_name: requesterUser?.username ?? null,
          target_user_name: targetUser?.username ?? null,
          target_tool_name: targetTool?.name ?? null,
        };
      })
    );

    return res.json(enriched.map(mapRequest));
  } catch {
    return res.status(500).json({ error: 'Erro interno ao listar solicitações.' });
  }
};

export const reviewModerationRequest = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const requestId = req.params.id;
  const action = req.params.action as 'approve' | 'reject';

  if (!authUser?.isOwner || !authUser.userId) {
    return res.status(403).json({ error: 'Apenas o dono do sistema pode revisar solicitações de banimento.' });
  }

  try {
    const db = await getMongoDb();
    const moderation_requests = db.collection('moderation_requests');
    const users = db.collection('users');
    const tools = db.collection('tools');

    const requestObjectId = new ObjectId(requestId);
    const request = await moderation_requests.findOne({ _id: requestObjectId });

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Esta solicitação já foi revisada.' });
    }

    if (action === 'approve') {
      if (request.request_type === 'ban_user' && request.target_user_id) {
        await users.updateOne(
          { _id: request.target_user_id },
          {
            $set: {
              is_banned: true,
              ban_reason: request.reason,
              banned_at: new Date(),
            }
          }
        );
      }

      if (request.request_type === 'ban_post' && request.target_tool_id) {
        await tools.updateOne(
          { id: request.target_tool_id },
          {
            $set: {
              blocked_by_owner: true,
              blocked_reason: request.reason,
              blocked_at: new Date(),
            }
          }
        );
      }
    }

    await moderation_requests.updateOne(
      { _id: requestObjectId },
      {
        $set: {
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewed_by: new ObjectId(authUser.userId),
          reviewed_at: new Date(),
        }
      }
    );

    return res.json({
      message: action === 'approve' ? 'Solicitação aprovada.' : 'Solicitação rejeitada.',
    });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao revisar solicitação.' });
  }
};

export const blockPost = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const toolId = Number(req.params.id);
  const reason = ensureReason(req.body?.reason);

  if (!authUser?.isOwner) {
    return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  }

  try {
    const db = await getMongoDb();
    const tools = db.collection('tools');

    await tools.updateOne(
      { id: toolId },
      {
        $set: {
          blocked_by_owner: true,
          blocked_reason: reason || 'Bloqueado pelo dono do sistema.',
          blocked_at: new Date(),
        }
      }
    );

    return res.json({ message: 'Post bloqueado com sucesso.' });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao bloquear post.' });
  }
};

export const unblockPost = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const toolId = Number(req.params.id);

  if (!authUser?.isOwner) {
    return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  }

  try {
    const db = await getMongoDb();
    const tools = db.collection('tools');

    await tools.updateOne(
      { id: toolId },
      {
        $set: {
          blocked_by_owner: false,
          blocked_reason: null,
          blocked_at: null,
        }
      }
    );

    return res.json({ message: 'Post desbloqueado com sucesso.' });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao desbloquear post.' });
  }
};

export const listMyMessages = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);

  if (!authUser?.userId) {
    return res.status(403).json({ error: 'Não autorizado.' });
  }

  try {
    const db = await getMongoDb();
    const user_messages = db.collection('user_messages');

    const rows = await user_messages
      .find({ recipient_user_id: new ObjectId(authUser.userId) })
      .sort({ created_at: -1 })
      .toArray();

    return res.json(rows.map(mapMessage));
  } catch {
    return res.status(500).json({ error: 'Erro interno ao listar mensagens.' });
  }
};

export const markMyMessageAsRead = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const messageId = req.params.id;

  if (!authUser?.userId) {
    return res.status(403).json({ error: 'Não autorizado.' });
  }

  try {
    const db = await getMongoDb();
    const user_messages = db.collection('user_messages');
    const messageObjectId = new ObjectId(messageId);

    const result = await user_messages.updateOne(
      { _id: messageObjectId, recipient_user_id: new ObjectId(authUser.userId) },
      { $set: { read_at: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Mensagem não encontrada.' });
    }

    return res.json({ message: 'Mensagem marcada como lida.' });
  } catch {
    return res.status(500).json({ error: 'Erro interno ao marcar mensagem como lida.' });
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const { limit = '50', skip = '0' } = req.query;

  if (!authUser?.isOwner) {
    return res.status(403).json({ error: 'Acesso restrito ao dono do sistema.' });
  }

  try {
    const db = await getMongoDb();
    const auditCollection = db.collection('audit_logs');

    const limitNum = Math.min(Number(limit) || 50, 500);
    const skipNum = Number(skip) || 0;

    const logs = await auditCollection
      .find({})
      .sort({ timestamp: -1 })
      .limit(limitNum)
      .skip(skipNum)
      .toArray();

    const total = await auditCollection.countDocuments({});

    return res.json({
      logs,
      pagination: {
        total,
        limit: limitNum,
        skip: skipNum,
        hasMore: skipNum + limitNum < total,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ error: 'Erro ao buscar logs de auditoria.' });
  }
};
