import { Request, Response } from 'express';
import { getMongoDb } from '../config/mongo';

export type ToolStatus = 'pending' | 'approved' | 'rejected';

type ToolDocument = {
  id: number;
  userId: number;
  name: string;
  description: string;
  screenshot: string | null;
  url: string;
  category: string;
  tags: string[];
  likesCount: number;
  likedUserIds: number[];
  favoritedUserIds: number[];
  status: ToolStatus;
  approvedAt: Date | null;
  blockedByOwner: boolean;
  blockedReason: string | null;
  blockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const normalizeTags = (tags: unknown): string[] => {
  if (!Array.isArray(tags)) return [];

  const uniqueTags = new Set<string>();
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const normalized = tag.trim().toLowerCase();
    if (normalized.length < 2 || normalized.length > 32) continue;
    uniqueTags.add(normalized);
  }

  return Array.from(uniqueTags).slice(0, 10);
};

const parseTags = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeTags(value);

  if (typeof value === 'string') {
    try {
      return normalizeTags(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return [];
};

const toToolResponse = (tool: ToolDocument) => ({
  id: tool.id,
  name: tool.name,
  description: tool.description,
  screenshot: tool.screenshot,
  url: tool.url,
  category: tool.category,
  tags: tool.tags,
  likes_count: tool.likesCount,
  status: tool.status,
  approved_at: tool.approvedAt,
  blocked_by_owner: tool.blockedByOwner,
  blocked_reason: tool.blockedReason,
  blocked_at: tool.blockedAt,
  created_at: tool.createdAt,
  updated_at: tool.updatedAt,
});

const getToolCollection = async () => {
  const db = await getMongoDb();
  return db.collection<ToolDocument>('tools');
};

const getCounterCollection = async () => {
  const db = await getMongoDb();
  return db.collection<{ _id: string; seq: number }>('counters');
};

const nextSequence = async (name: string) => {
  const counters = await getCounterCollection();
  await counters.updateOne(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true }
  );

  const counter = await counters.findOne({ _id: name });
  return Number(counter?.seq ?? 1);
};

const getAuthUser = (req: Request) => (req as any).user as {
  userId?: number;
  isOwner?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
};

const ensureReason = (reason: unknown) => (typeof reason === 'string' ? reason.trim().slice(0, 1000) : '');

export const createTool = async (req: Request, res: Response) => {
  const { name, description, screenshot, url, category, tags } = req.body;
  const user = (req as any).user;

  if (!name || !url || !category) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  if (screenshot && typeof screenshot !== 'string') {
    return res.status(400).json({ error: 'Imagem inválida.' });
  }

  const toolCollection = await getToolCollection();
  const now = new Date();
  const id = await nextSequence('tools');
  const normalizedTags = parseTags(tags);

  await toolCollection.insertOne({
    id,
    userId: user.userId,
    name,
    description: description ?? '',
    screenshot: screenshot?.trim() ? screenshot.trim() : null,
    url,
    category,
    tags: normalizedTags,
    likesCount: 0,
    likedUserIds: [],
    favoritedUserIds: [],
    status: 'pending',
    approvedAt: null,
    blockedByOwner: false,
    blockedReason: null,
    blockedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return res.status(201).json({ message: 'Recomendação enviada para análise.' });
};

export const listApprovedTools = async (_req: Request, res: Response) => {
  try {
    const toolCollection = await getToolCollection();
    
    // Create index if it doesn't exist for faster queries
    await toolCollection.createIndex({ status: 1, blockedByOwner: 1, approvedAt: -1 });
    
    const rows = await toolCollection
      .find({ status: 'approved', blockedByOwner: false })
      .sort({ approvedAt: -1, createdAt: -1 })
      .limit(50) // Reduce limit for faster response
      .toArray();

    return res.json(rows.map(toToolResponse));
  } catch (error) {
    console.error('Error fetching approved tools:', error);
    return res.status(500).json({ error: 'Failed to fetch approved tools' });
  }
};

export const listMyTools = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const toolCollection = await getToolCollection();
  const rows = await toolCollection
    .find({ userId: user.userId })
    .sort({ createdAt: -1 })
    .toArray();

  return res.json(rows.map(toToolResponse));
};

export const listMyToolInteractions = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const toolCollection = await getToolCollection();

  const likedRows = await toolCollection.find({ likedUserIds: user.userId }).project({ id: 1 }).toArray();
  const favoriteRows = await toolCollection.find({ favoritedUserIds: user.userId }).project({ id: 1 }).toArray();

  return res.json({
    likedToolIds: likedRows.map((row) => Number(row.id)),
    favoritedToolIds: favoriteRows.map((row) => Number(row.id)),
  });
};

export const likeTool = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const toolId = Number(req.params.id);

  if (!Number.isInteger(toolId) || toolId <= 0) {
    return res.status(400).json({ error: 'ID de ferramenta inválido.' });
  }

  const toolCollection = await getToolCollection();
  const tool = await toolCollection.findOne({ id: toolId, status: 'approved' });

  if (!tool) {
    return res.status(404).json({ error: 'Ferramenta não encontrada para curtir.' });
  }

  const alreadyLiked = tool.likedUserIds.includes(user.userId);
  const nextLikedUserIds = alreadyLiked
    ? tool.likedUserIds.filter((likedUserId) => likedUserId !== user.userId)
    : [...tool.likedUserIds, user.userId];

  const nextLikesCount = nextLikedUserIds.length;

  await toolCollection.updateOne(
    { id: toolId },
    {
      $set: {
        likedUserIds: nextLikedUserIds,
        likesCount: nextLikesCount,
        updatedAt: new Date(),
      },
    }
  );

  return res.json({
    message: alreadyLiked ? 'Curtida removida.' : 'Curtida registrada.',
    liked: !alreadyLiked,
    likesCount: nextLikesCount,
  });
};

export const favoriteTool = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const toolId = Number(req.params.id);

  if (!Number.isInteger(toolId) || toolId <= 0) {
    return res.status(400).json({ error: 'ID de ferramenta inválido.' });
  }

  const toolCollection = await getToolCollection();
  const tool = await toolCollection.findOne({ id: toolId, status: 'approved' });

  if (!tool) {
    return res.status(404).json({ error: 'Ferramenta não encontrada para favoritar.' });
  }

  const alreadyFavorited = tool.favoritedUserIds.includes(user.userId);
  const nextFavoritedUserIds = alreadyFavorited
    ? tool.favoritedUserIds.filter((favoritedUserId) => favoritedUserId !== user.userId)
    : [...tool.favoritedUserIds, user.userId];

  await toolCollection.updateOne(
    { id: toolId },
    {
      $set: {
        favoritedUserIds: nextFavoritedUserIds,
        updatedAt: new Date(),
      },
    }
  );

  return res.json({
    message: alreadyFavorited ? 'Favorito removido.' : 'Favorito salvo.',
    favorited: !alreadyFavorited,
  });
};

export const listMyFavoriteTools = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const toolCollection = await getToolCollection();

  const rows = await toolCollection
    .find({ favoritedUserIds: user.userId, status: 'approved', blockedByOwner: false })
    .sort({ createdAt: -1 })
    .toArray();

  return res.json(rows.map(toToolResponse));
};

export const listPendingTools = async (_req: Request, res: Response) => {
  const toolCollection = await getToolCollection();
  const rows = await toolCollection.find({ status: 'pending' }).sort({ createdAt: 1 }).toArray();
  return res.json(rows.map(toToolResponse));
};

export const approveTool = async (req: Request, res: Response) => {
  const toolId = Number(req.params.id);
  const toolCollection = await getToolCollection();

  await toolCollection.updateOne(
    { id: toolId },
    { $set: { status: 'approved', approvedAt: new Date(), updatedAt: new Date() } }
  );

  return res.json({ message: 'Ferramenta aprovada.' });
};

export const rejectTool = async (req: Request, res: Response) => {
  const toolId = Number(req.params.id);
  const toolCollection = await getToolCollection();

  await toolCollection.updateOne(
    { id: toolId },
    { $set: { status: 'rejected', updatedAt: new Date() } }
  );

  return res.json({ message: 'Ferramenta reprovada.' });
};

export const updateToolScreenshot = async (req: Request, res: Response) => {
  const toolId = Number(req.params.id);
  const { screenshot } = req.body as { screenshot?: string | null };

  if (screenshot && typeof screenshot !== 'string') {
    return res.status(400).json({ error: 'URL de imagem inválida.' });
  }

  const toolCollection = await getToolCollection();
  await toolCollection.updateOne(
    { id: toolId },
    {
      $set: {
        screenshot: screenshot?.trim() ? screenshot.trim() : null,
        updatedAt: new Date(),
      },
    }
  );

  return res.json({ message: 'Imagem da postagem atualizada com sucesso.' });
};

export const uploadToolImage = async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  }

  const base64 = file.buffer.toString('base64');
  const imageUrl = `data:${file.mimetype};base64,${base64}`;

  return res.status(201).json({ url: imageUrl });
};

export const listReviewedTools = async (req: Request, res: Response) => {
  const { status } = req.query;
  const validStatus = status === 'approved' || status === 'rejected' ? status : 'approved';

  const toolCollection = await getToolCollection();
  const rows = await toolCollection
    .find({ status: validStatus })
    .sort({ approvedAt: -1, createdAt: -1 })
    .toArray();

  return res.json(rows.map(toToolResponse));
};
