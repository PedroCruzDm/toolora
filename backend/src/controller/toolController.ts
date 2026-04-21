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
    "SELECT id, name, description, screenshot, url, category, tags, likes_count, status, approved_at FROM tools WHERE status = 'approved' ORDER BY approved_at DESC"
  );
  return res.json((rows as any[]).map(row => ({ ...row, tags: parseTags(row.tags) })));
};

// Listar recomendações do usuário logado
export const listMyTools = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const [rows] = await pool.execute(
    'SELECT id, name, description, screenshot, url, category, tags, status, likes_count, approved_at FROM tools WHERE user_id = ? ORDER BY created_at DESC',
    [user.userId]
  );
  return res.json((rows as any[]).map(row => ({ ...row, tags: parseTags(row.tags) })));
};

// Like/Unlike ferramenta (público logado)
export const likeTool = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const toolId = req.params.id;
  // Simples: incrementa likes (não impede múltiplos likes do mesmo user)
  await pool.execute('UPDATE tools SET likes_count = likes_count + 1 WHERE id = ?', [toolId]);
  return res.json({ message: 'Like registrado.' });
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
