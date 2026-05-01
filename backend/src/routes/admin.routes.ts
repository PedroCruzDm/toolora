import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware, moderatorMiddleware, ownerMiddleware } from '../middlewares/roleMiddleware';
import { rateLimits } from '../middlewares/rateLimitMiddleware';
import { auditMiddleware, AuditAction } from '../middlewares/auditMiddleware';
import {
  listAllUsers,
  setUserRole,
  banUser,
  unbanUser,
  getUserStats,
  sendWarningMessage,
  createModerationRequest,
  listModerationRequests,
  reviewModerationRequest,
  blockPost,
  unblockPost,
  getAuditLogs,
} from '../controller/userMongoController';

const router = Router();

// User management
router.get(
  '/users',
  authMiddleware,
  moderatorMiddleware,
  rateLimits.management('list_users'),
  auditMiddleware(AuditAction.USER_LISTED),
  listAllUsers
);

router.patch(
  '/users/:id/role',
  authMiddleware,
  ownerMiddleware,
  rateLimits.sensitive('set_user_role'),
  auditMiddleware(AuditAction.USER_ROLE_CHANGED),
  setUserRole
);

router.post(
  '/users/:id/ban',
  authMiddleware,
  ownerMiddleware,
  rateLimits.sensitive('ban_user'),
  auditMiddleware(AuditAction.USER_BANNED),
  banUser
);

router.post(
  '/users/:id/unban',
  authMiddleware,
  ownerMiddleware,
  rateLimits.sensitive('unban_user'),
  auditMiddleware(AuditAction.USER_UNBANNED),
  unbanUser
);

router.post(
  '/users/:id/warning',
  authMiddleware,
  moderatorMiddleware,
  rateLimits.moderation('send_warning'),
  auditMiddleware(AuditAction.USER_WARNING_SENT),
  sendWarningMessage
);

router.get(
  '/users/:id/stats',
  authMiddleware,
  moderatorMiddleware,
  rateLimits.management('view_stats'),
  auditMiddleware(AuditAction.USER_STATS_VIEWED),
  getUserStats
);

// Moderation requests
router.post(
  '/requests',
  authMiddleware,
  moderatorMiddleware,
  rateLimits.moderation('create_request'),
  auditMiddleware(AuditAction.MODERATION_REQUEST_CREATED),
  createModerationRequest
);

router.get(
  '/requests',
  authMiddleware,
  moderatorMiddleware,
  rateLimits.management('list_requests'),
  auditMiddleware(AuditAction.MODERATION_REQUEST_LISTED),
  listModerationRequests
);

router.patch(
  '/requests/:id/approve',
  authMiddleware,
  ownerMiddleware,
  rateLimits.sensitive('review_request'),
  auditMiddleware(AuditAction.MODERATION_REQUEST_REVIEWED),
  (req, res) => {
    req.params.action = 'approve';
    return reviewModerationRequest(req, res);
  }
);

router.patch(
  '/requests/:id/reject',
  authMiddleware,
  ownerMiddleware,
  rateLimits.sensitive('review_request'),
  auditMiddleware(AuditAction.MODERATION_REQUEST_REVIEWED),
  (req, res) => {
    req.params.action = 'reject';
    return reviewModerationRequest(req, res);
  }
);

// Post management
router.post(
  '/posts/:id/block',
  authMiddleware,
  ownerMiddleware,
  rateLimits.sensitive('block_post'),
  auditMiddleware(AuditAction.POST_BLOCKED),
  blockPost
);

router.post(
  '/posts/:id/unblock',
  authMiddleware,
  ownerMiddleware,
  rateLimits.sensitive('unblock_post'),
  auditMiddleware(AuditAction.POST_UNBLOCKED),
  unblockPost
);

// Audit logs (owner only)
router.get(
  '/logs',
  authMiddleware,
  ownerMiddleware,
  rateLimits.management('view_logs'),
  getAuditLogs
);

export default router;