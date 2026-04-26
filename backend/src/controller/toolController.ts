import { Request, Response } from 'express';
import pool from '../config/db';
import { ToolStatus } from '../model/tool.model';

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
      const parsed = JSON.parse(value);
      return normalizeTags(parsed);
    } catch {
      return [];
    }
  }

  return [];
};

// Criar recomendação (usuário logado)
export const createTool = async (req: Request, res: Response) => {
  const { name, description, screenshot, url, category, tags } = req.body;
  const user = (req as any).user;
  if (!name || !url || !category) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  if (screenshot && (typeof screenshot !== 'string' || !/^https?:\/\//i.test(screenshot))) {
    return res.status(400).json({ error: 'URL de imagem inválida.' });
  }

  const normalizedTags = normalizeTags(tags);

  const [result] = await pool.execute(
    'INSERT INTO tools (user_id, name, description, screenshot, url, category, tags, status, likes_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
    [user.userId, name, description, screenshot ?? null, url, category, JSON.stringify(normalizedTags), 'pending']
  );
  return res.status(201).json({ message: 'Recomendação enviada para análise.' });
};

// Listar ferramentas aprovadas (público)
export const listApprovedTools = async (_req: Request, res: Response) => {
  const [rows] = await pool.execute(
    "SELECT id, name, description, screenshot, url, category, tags, likes_count, status, approved_at, blocked_by_owner, blocked_reason, blocked_at FROM tools WHERE status = 'approved' AND blocked_by_owner = FALSE ORDER BY approved_at DESC"
  );
  return res.json((rows as any[]).map(row => ({ ...row, tags: parseTags(row.tags) })));
};

// Listar recomendações do usuário logado
export const listMyTools = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const [rows] = await pool.execute(
    'SELECT id, name, description, screenshot, url, category, tags, status, likes_count, approved_at, blocked_by_owner, blocked_reason, blocked_at FROM tools WHERE user_id = ? ORDER BY created_at DESC',
    [user.userId]
  );
  return res.json((rows as any[]).map(row => ({ ...row, tags: parseTags(row.tags) })));
};

// Listar estado de likes/favoritos do usuário logado
export const listMyToolInteractions = async (req: Request, res: Response) => {
  const user = (req as any).user;

  const [likedRows] = await pool.execute(
    'SELECT tool_id FROM tool_likes WHERE user_id = ?',
    [user.userId]
  );

  const [favoriteRows] = await pool.execute(
    'SELECT tool_id FROM tool_favorites WHERE user_id = ?',
    [user.userId]
  );

  return res.json({
    likedToolIds: (likedRows as any[]).map((row) => Number(row.tool_id)),
    favoritedToolIds: (favoriteRows as any[]).map((row) => Number(row.tool_id)),
  });
};

// Like/Unlike ferramenta (usuário logado)
export const likeTool = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const toolId = Number(req.params.id);

  if (!Number.isInteger(toolId) || toolId <= 0) {
    return res.status(400).json({ error: 'ID de ferramenta inválido.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [toolRows] = await connection.execute(
      "SELECT id FROM tools WHERE id = ? AND status = 'approved' LIMIT 1",
      [toolId]
    );

    if (!Array.isArray(toolRows) || toolRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Ferramenta não encontrada para curtir.' });
    }

    const [likeRows] = await connection.execute(
      'SELECT 1 FROM tool_likes WHERE user_id = ? AND tool_id = ? LIMIT 1',
      [user.userId, toolId]
    );

    const alreadyLiked = Array.isArray(likeRows) && likeRows.length > 0;

    if (alreadyLiked) {
      await connection.execute(
        'DELETE FROM tool_likes WHERE user_id = ? AND tool_id = ?',
        [user.userId, toolId]
      );
    } else {
      await connection.execute(
        'INSERT INTO tool_likes (user_id, tool_id) VALUES (?, ?)',
        [user.userId, toolId]
      );
    }

    await connection.execute(
      'UPDATE tools SET likes_count = (SELECT COUNT(*) FROM tool_likes WHERE tool_id = ?) WHERE id = ?',
      [toolId, toolId]
    );

    const [countRows] = await connection.execute(
      'SELECT likes_count FROM tools WHERE id = ? LIMIT 1',
      [toolId]
    );

    await connection.commit();

    const likesCount = Array.isArray(countRows) && countRows[0]
      ? Number((countRows[0] as any).likes_count ?? 0)
      : 0;

    return res.json({
      message: alreadyLiked ? 'Curtida removida.' : 'Curtida registrada.',
      liked: !alreadyLiked,
      likesCount,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ error: 'Não foi possível atualizar a curtida.' });
  } finally {
    connection.release();
  }
};

// Favoritar/Desfavoritar ferramenta (usuário logado)
export const favoriteTool = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const toolId = Number(req.params.id);

  if (!Number.isInteger(toolId) || toolId <= 0) {
    return res.status(400).json({ error: 'ID de ferramenta inválido.' });
  }

  const [toolRows] = await pool.execute(
    "SELECT id FROM tools WHERE id = ? AND status = 'approved' LIMIT 1",
    [toolId]
  );

  if (!Array.isArray(toolRows) || toolRows.length === 0) {
    return res.status(404).json({ error: 'Ferramenta não encontrada para favoritar.' });
  }

  const [favoriteRows] = await pool.execute(
    'SELECT 1 FROM tool_favorites WHERE user_id = ? AND tool_id = ? LIMIT 1',
    [user.userId, toolId]
  );

  const alreadyFavorited = Array.isArray(favoriteRows) && favoriteRows.length > 0;

  if (alreadyFavorited) {
    await pool.execute(
      'DELETE FROM tool_favorites WHERE user_id = ? AND tool_id = ?',
      [user.userId, toolId]
    );
  } else {
    await pool.execute(
      'INSERT INTO tool_favorites (user_id, tool_id) VALUES (?, ?)',
      [user.userId, toolId]
    );
  }

  return res.json({
    message: alreadyFavorited ? 'Favorito removido.' : 'Favorito salvo.',
    favorited: !alreadyFavorited,
  });
};

// Listar favoritos do usuário logado
export const listMyFavoriteTools = async (req: Request, res: Response) => {
  const user = (req as any).user;

  const [rows] = await pool.execute(
    "SELECT t.id, t.name, t.description, t.screenshot, t.url, t.category, t.tags, t.likes_count, t.status, t.approved_at, t.blocked_by_owner, t.blocked_reason, t.blocked_at FROM tools t INNER JOIN tool_favorites tf ON tf.tool_id = t.id WHERE tf.user_id = ? AND t.status = 'approved' AND t.blocked_by_owner = FALSE ORDER BY tf.created_at DESC",
    [user.userId]
  );

  return res.json((rows as any[]).map((row) => ({ ...row, tags: parseTags(row.tags) })));
};

// Listar recomendações pendentes (admin)
export const listPendingTools = async (_req: Request, res: Response) => {
  const [rows] = await pool.execute(
    "SELECT t.*, u.username FROM tools t JOIN users u ON t.user_id = u.id WHERE t.status = 'pending' ORDER BY t.created_at ASC"
  );
  return res.json((rows as any[]).map(row => ({ ...row, tags: parseTags(row.tags) })));
};

// Aprovar recomendação (admin)
export const approveTool = async (req: Request, res: Response) => {
  const toolId = req.params.id;
  await pool.execute(
    "UPDATE tools SET status = 'approved', approved_at = NOW() WHERE id = ?",
    [toolId]
  );
  return res.json({ message: 'Ferramenta aprovada.' });
};

// Reprovar recomendação (admin)
export const rejectTool = async (req: Request, res: Response) => {
  const toolId = req.params.id;
  await pool.execute(
    "UPDATE tools SET status = 'rejected' WHERE id = ?",
    [toolId]
  );
  return res.json({ message: 'Ferramenta reprovada.' });
};

// Atualizar screenshot da recomendação (admin)
export const updateToolScreenshot = async (req: Request, res: Response) => {
  const toolId = req.params.id;
  const { screenshot } = req.body as { screenshot?: string | null };

  if (screenshot && (typeof screenshot !== 'string' || !/^https?:\/\//i.test(screenshot))) {
    return res.status(400).json({ error: 'URL de imagem inválida.' });
  }

  await pool.execute(
    'UPDATE tools SET screenshot = ? WHERE id = ?',
    [screenshot ?? null, toolId]
  );

  return res.json({ message: 'Imagem da postagem atualizada com sucesso.' });
};

// Upload de imagem local (usuário/admin)
export const uploadToolImage = async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const imageUrl = `${baseUrl}/uploads/tools/${file.filename}`;
  return res.status(201).json({ url: imageUrl });
};

// Listar recomendações já revisadas (admin)
export const listReviewedTools = async (req: Request, res: Response) => {
  const { status } = req.query;
  const validStatus = status === 'approved' || status === 'rejected' ? status : 'approved';
  
  const [rows] = await pool.execute(
    "SELECT t.*, u.username FROM tools t JOIN users u ON t.user_id = u.id WHERE t.status = ? ORDER BY t.approved_at DESC, t.created_at DESC",
    [validStatus]
  );
  return res.json((rows as any[]).map(row => ({ ...row, tags: parseTags(row.tags) })));
};