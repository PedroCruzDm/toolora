import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import {
  createTool,
  listApprovedTools,
  listMyTools,
  likeTool,
  listPendingTools,
  listReviewedTools,
  approveTool,
  rejectTool
} from '../controller/toolController';

const router = Router();

// Público
router.get('/', listApprovedTools);

// Usuário logado
router.post('/', authMiddleware, createTool);
router.get('/mine', authMiddleware, listMyTools);
router.post('/:id/like', authMiddleware, likeTool);

// Admin
router.get('/pending', authMiddleware, adminMiddleware, listPendingTools);
router.get('/reviewed', authMiddleware, adminMiddleware, listReviewedTools);
router.patch('/:id/approve', authMiddleware, adminMiddleware, approveTool);
router.patch('/:id/reject', authMiddleware, adminMiddleware, rejectTool);

export default router;