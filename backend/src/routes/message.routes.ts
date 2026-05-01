import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { listMyMessages, markMyMessageAsRead } from '../controller/userMongoController';

const router = Router();

router.get('/me', authMiddleware, listMyMessages);
router.patch('/:id/read', authMiddleware, markMyMessageAsRead);

export default router;