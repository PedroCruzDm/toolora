import { Request, Response, NextFunction } from 'express';
import { getMongoDb } from '../config/mongo';

export enum AuditAction {
  USER_LISTED = 'USER_LISTED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_BANNED = 'USER_BANNED',
  USER_UNBANNED = 'USER_UNBANNED',
  USER_WARNING_SENT = 'USER_WARNING_SENT',
  USER_STATS_VIEWED = 'USER_STATS_VIEWED',

  MODERATION_REQUEST_CREATED = 'MODERATION_REQUEST_CREATED',
  MODERATION_REQUEST_LISTED = 'MODERATION_REQUEST_LISTED',
  MODERATION_REQUEST_REVIEWED = 'MODERATION_REQUEST_REVIEWED',

  POST_BLOCKED = 'POST_BLOCKED',
  POST_UNBLOCKED = 'POST_UNBLOCKED',
}

export interface AuditLog {
  _id?: any;
  action: AuditAction;
  userId: string;
  userEmail: string;
  targetUserId?: string;
  targetResourceId?: string | number;
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

// Middleware de auditoria (higher-order function)
export const auditMiddleware = (action: AuditAction) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      const statusCode = res.statusCode || 200;
      const user = (req as any).user;
      const isSuccess = statusCode >= 200 && statusCode < 300;

      logAudit({
        action,
        userId: user?.userId || 'anonymous',
        userEmail: user?.email || 'unknown',
        targetUserId: req.params.id,
        targetResourceId: req.params.id,
        resourceType: req.path.split('/')[1],
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        status: isSuccess ? 'success' : 'failure',
        statusCode,
        details: {
          method: req.method,
          path: req.path,
        },
      }).catch(() => {});

      return originalJson(data);
    };

    next();
  };
};