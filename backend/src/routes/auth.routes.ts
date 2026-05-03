import { Router } from 'express';
import { register, login, updateUser, deleteUser, listUsers, currentSession, requestPasswordReset, confirmPasswordReset } from '../controller/authMongoController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/password-reset/request', requestPasswordReset);
router.post('/password-reset/confirm', confirmPasswordReset);
router.get('/me', authMiddleware, currentSession);
router.put('/user/:id', authMiddleware, updateUser);
router.delete('/user/:id', authMiddleware, deleteUser);
router.get('/users', authMiddleware, adminMiddleware, listUsers);

export default router;