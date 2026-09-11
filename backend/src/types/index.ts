import { Request } from 'express';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'owner' | 'admin' | 'moderator' | 'user';
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isBanned: boolean;
  tokenVersion?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Tipos comuns usados em vários controllers
export interface ToolDocument {
  id: number;
  userId: string;
  name: string;
  description: string;
  screenshot: string | null;
  url: string;
  category: string;
  tags: string[];
  likesCount: number;
  likedUserIds: string[];
  favoritedUserIds: string[];
  status: 'pending' | 'approved' | 'rejected';
  approvedAt: Date | null;
  blockedByOwner: boolean;
  blockedReason: string | null;
  blockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument {
  _id: any;
  role: 'owner' | 'admin' | 'moderator' | 'user';
  role_key_hash?: string | null;
  username: string;
  email: string;
  password: string;
  profile_image?: string;
  token_version: number;
  is_owner: boolean;
  is_admin: boolean;
  is_moderator: boolean;
  is_banned: boolean;
  ban_reason?: string;
  banned_at?: Date;
  created_at: Date;
}