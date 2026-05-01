import { Request, Response, NextFunction } from 'express';
import { getMongoDb } from '../config/mongo';

export enum AuditAction {
  // User management
  USER_LISTED = 'USER_LISTED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_BANNED = 'USER_BANNED',
  USER_UNBANNED = 'USER_UNBANNED',
  USER_WARNING_SENT = 'USER_WARNING_SENT',
  USER_STATS_VIEWED = 'USER_STATS_VIEWED',

  // Moderation
  MODERATION_REQUEST_CREATED = 'MODERATION_REQUEST_CREATED',
  MODERATION_REQUEST_LISTED = 'MODERATION_REQUEST_LISTED',
  MODERATION_REQUEST_REVIEWED = 'MODERATION_REQUEST_REVIEWED',

  // Post management
  POST_BLOCKED = 'POST_BLOCKED',
  POST_UNBLOCKED = 'POST_UNBLOCKED',
}

export interface AuditLog {
  _id?: any;
  action: AuditAction;
  userId: number;
  userEmail: string;
  targetUserId?: number;
  targetResourceId?: number | string;
  resourceType?: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  statusCode: number;
  details?: Record<string, any>;
  timestamp: Date;
}

export const logAudit = async (auditData: Omit<AuditLog, '_id' | 'timestamp'>) => {
  try {
    const db = await getMongoDb();
    const auditCollection = db.collection('audit_logs');

    const logEntry: AuditLog = {
      ...auditData,
      timestamp: new Date(),
    };

    await auditCollection.insertOne(logEntry);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};

export const auditMiddleware = (action: AuditAction) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json
    const originalJson = res.json.bind(res);

    // Intercept res.json to capture response status
    res.json = function(data: any) {
      const statusCode = res.statusCode;
      const user = (req as any).user;
      const isSuccess = statusCode >= 200 && statusCode < 300;

      // Log the action
      logAudit({
        action,
        userId: user?.userId || 0,
        userEmail: user?.email || 'unknown',
        targetUserId: req.params.id ? Number(req.params.id) : undefined,
        targetResourceId: req.params.id,
        resourceType: req.path.split('/')[1],
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        status: isSuccess ? 'success' : 'failure',
        statusCode,
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          bodyKeys: Object.keys(req.body || {}),
        },
      }).catch(err => console.error('Audit log error:', err));

      return originalJson(data);
    };

    next();
  };
};

// Get audit logs for a user (admin only)
export const getAuditLogs = async (
  userId?: number,
  action?: AuditAction,
  limit: number = 100,
  skip: number = 0
) => {
  try {
    const db = await getMongoDb();
    const auditCollection = db.collection('audit_logs');

    const filter: any = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;

    const logs = await auditCollection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    const total = await auditCollection.countDocuments(filter);

    return { logs, total };
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return { logs: [], total: 0 };
  }
};
