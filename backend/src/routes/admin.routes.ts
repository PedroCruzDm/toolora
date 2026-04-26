import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware, moderatorMiddleware, ownerMiddleware } from '../middlewares/roleMiddleware';
import {
  listAllUsers,
  setUserRole,
  banUser,
  unbanUser,
  sendWarningMessage,
  createModerationRequest,
  listModerationRequests,
  reviewModerationRequest,
  blockPost,
  unblockPost,
} from '../controller/User.controller';

const router = Router();

router.get('/users', authMiddleware, moderatorMiddleware, listAllUsers);
router.patch('/users/:id/role', authMiddleware, ownerMiddleware, setUserRole);
router.post('/users/:id/ban', authMiddleware, ownerMiddleware, banUser);
router.post('/users/:id/unban', authMiddleware, ownerMiddleware, unbanUser);
router.post('/users/:id/warning', authMiddleware, moderatorMiddleware, sendWarningMessage);

router.post('/requests', authMiddleware, moderatorMiddleware, createModerationRequest);
router.get('/requests', authMiddleware, moderatorMiddleware, listModerationRequests);
router.patch('/requests/:id/approve', authMiddleware, ownerMiddleware, (req, res) => {
  req.params.action = 'approve';
  return reviewModerationRequest(req, res);
});
router.patch('/requests/:id/reject', authMiddleware, ownerMiddleware, (req, res) => {
  req.params.action = 'reject';
  return reviewModerationRequest(req, res);
});

router.post('/posts/:id/block', authMiddleware, ownerMiddleware, blockPost);
router.post('/posts/:id/unblock', authMiddleware, ownerMiddleware, unblockPost);

export default router;