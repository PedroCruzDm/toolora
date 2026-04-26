import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { moderatorMiddleware } from '../middlewares/roleMiddleware';
import {
  createTool,
  listApprovedTools,
  listMyTools,
  likeTool,
  favoriteTool,
  listMyToolInteractions,
  listMyFavoriteTools,
  listPendingTools,
  listReviewedTools,
  approveTool,
  rejectTool,
  updateToolScreenshot,
  uploadToolImage
} from '../controller/toolController';
import { uploadImage } from '../middlewares/uploadMiddleware';

const router = Router();

// Público
router.get('/', listApprovedTools);

// Usuário logado
router.post('/', authMiddleware, createTool);
router.post('/upload-image', authMiddleware, uploadImage.single('image'), uploadToolImage);
router.get('/mine', authMiddleware, listMyTools);
router.get('/interactions', authMiddleware, listMyToolInteractions);
router.get('/favorites', authMiddleware, listMyFavoriteTools);
router.post('/:id/like', authMiddleware, likeTool);
router.post('/:id/favorite', authMiddleware, favoriteTool);

// Admin
router.get('/pending', authMiddleware, moderatorMiddleware, listPendingTools);
router.get('/reviewed', authMiddleware, moderatorMiddleware, listReviewedTools);
router.patch('/:id/approve', authMiddleware, moderatorMiddleware, approveTool);
router.patch('/:id/reject', authMiddleware, moderatorMiddleware, rejectTool);
router.patch('/:id/screenshot', authMiddleware, adminMiddleware, updateToolScreenshot);

export default router;