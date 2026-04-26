import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { listMyMessages } from '../controller/User.controller';

const router = Router();

router.get('/me', authMiddleware, listMyMessages);

export default router;