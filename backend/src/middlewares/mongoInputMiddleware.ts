import { Request, Response, NextFunction } from 'express';

const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const isUnsafeKey = (key: string) => BLOCKED_KEYS.has(key) || key.startsWith('$') || key.includes('.');

const findUnsafeKey = (value: unknown, path = 'input'): string | null => {
  if (!value || typeof value !== 'object') return null;

  if (Array.isArray(value)) {

    for (let index = 0; index < value.length; index += 1) {
      const unsafeKey = findUnsafeKey(value[index], `${path}[${index}]`);
    
      if (unsafeKey) return unsafeKey;
    
    }
    
    return null;
  }

  for (const [key, child] of Object.entries(value)) {
    const currentPath = `${path}.${key}`;
    if (isUnsafeKey(key)) return currentPath;

    const unsafeKey = findUnsafeKey(child, currentPath);
    if (unsafeKey) return unsafeKey;
  }

  return null;
};

export const mongoInputMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const unsafeInput = [ ['body', req.body], ['query', req.query], ['params', req.params],
  ].reduce<string | null>((found, [source, value]) => {
    
    return found ?? findUnsafeKey(value, String(source));
  }, null);

  if (unsafeInput) {
    return res.status(400).json({
      error: 'Entrada inválida.',
    });
  }

  return next();
};