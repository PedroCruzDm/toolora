import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const ENCRYPTED_PREFIX = 'enc:v1:';

const getEncryptionKey = () => {
  const configuredKey = process.env.ENCRYPTION_KEY?.trim();
  if (!configuredKey) {
    throw new Error('ENCRYPTION_KEY não configurada. Defina uma chave hexadecimal de 64 caracteres.');
  }

  const key = Buffer.from(configuredKey, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error('ENCRYPTION_KEY inválida. Use exatamente 32 bytes em hexadecimal (64 caracteres).');
  }

  return key;
};

export const assertEncryptionKey = () => {
  getEncryptionKey();
};

export const encrypt = (value: string | null | undefined) => {
  if (value === null || value === undefined || value === '') return value ?? null;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('base64url')}.${authTag.toString('base64url')}.${ciphertext.toString('base64url')}`;
};

export const decrypt = (value: string | null | undefined) => {
  if (value === null || value === undefined || value === '') return value ?? null;
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;

  const payload = value.slice(ENCRYPTED_PREFIX.length).split('.');
  if (payload.length !== 3) throw new Error('Valor criptografado inválido.');

  const [iv, authTag, ciphertext] = payload.map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};

export const hashForLookup = (value: string) =>
  createHash('sha256').update(value.trim().toLowerCase(), 'utf8').digest('hex');

export const isEncrypted = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
