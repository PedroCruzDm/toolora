import { Request, Response } from 'express';
import pool from '../config/db';
import { ToolStatus } from '../model/tool.model';

// Criar recomendação (usuário logado)
export const createTool = async (req: Request, res: Response) => {
  const { name, description, screenshot, url, category } = req.body;
  const user = (req as any).user;
  if (!name || !url || !category) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }
  const [result] = await pool.execute(
    'INSERT INTO tools (user_id, name, description, screenshot, url, category, status, likes_count) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
    [user.userId, name, description, screenshot, url, category, 'pending']
  );
  return res.status(201).json({ message: 'Recomendação enviada para análise.' });
};

// Listar ferramentas aprovadas (público)
export const listApprovedTools = async (_req: Request, res: Response) => {
  const [rows] = await pool.execute(
    "SELECT id, name, description, screenshot, url, category, likes_count FROM tools WHERE status = 'approved' ORDER BY approved_at DESC"
  );
  return res.json(rows);
};

// Listar recomendações do usuário logado
export const listMyTools = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const [rows] = await pool.execute(
    'SELECT id, name, url, status, likes_count, approved_at FROM tools WHERE user_id = ? ORDER BY created_at DESC',
    [user.userId]
  );
  return res.json(rows);
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
  return res.json(rows);
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
