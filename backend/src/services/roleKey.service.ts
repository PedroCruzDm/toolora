import { createHash, randomBytes } from 'crypto';

const ROLE_KEY_BYTES = 32;

export const generateRoleKey = () => randomBytes(ROLE_KEY_BYTES).toString('base64url');

export const hashRoleKey = (roleKey: string) =>
  createHash('sha256').update(roleKey, 'utf8').digest('hex');