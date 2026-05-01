import fs from 'fs';
import path from 'path';

const ensureWritableDir = (directory: string) => {
  fs.mkdirSync(directory, { recursive: true });
  fs.accessSync(directory, fs.constants.W_OK);
};

const defaultUploadsRoot = path.join(process.cwd(), 'uploads');
const fallbackUploadsRoot = path.join(process.cwd(), 'uploads_local');

let uploadsRoot = defaultUploadsRoot;

try {
  ensureWritableDir(path.join(defaultUploadsRoot, 'tools'));
} catch {
  uploadsRoot = fallbackUploadsRoot;
  ensureWritableDir(path.join(fallbackUploadsRoot, 'tools'));
}

export const uploadsRootDir = uploadsRoot;
export const toolUploadsDir = path.join(uploadsRootDir, 'tools');
