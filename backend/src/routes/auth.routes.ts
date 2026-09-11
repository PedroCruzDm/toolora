import { Router } from 'express';
import { register, login, refreshSession, logout, updateUser, deleteUser, listUsers, currentSession, requestPasswordReset, confirmPasswordReset } from '../controller/authMongoController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/roleMiddleware';
import { rateLimits } from '../middlewares/rateLimitMiddleware';

const router = Router();

router.post('/register', rateLimits.auth('auth_register'), register);
router.post('/login', rateLimits.auth('auth_login'), login);
router.post('/refresh', rateLimits.auth('auth_refresh'), refreshSession);
router.post('/logout', rateLimits.auth('auth_logout'), logout);
router.post('/password-reset/request', rateLimits.auth('auth_password_reset_request'), requestPasswordReset);
router.post('/password-reset/confirm', rateLimits.auth('auth_password_reset_confirm'), confirmPasswordReset);
router.get('/me', authMiddleware, currentSession);
router.put('/user/:id', authMiddleware, updateUser);
router.delete('/user/:id', authMiddleware, deleteUser);
router.get('/users', authMiddleware, adminMiddleware, listUsers);

export default router;