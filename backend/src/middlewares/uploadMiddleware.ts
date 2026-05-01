import multer from 'multer';
 
const storage = multer.memoryStorage();

const isSupportedImage = (file: Express.Multer.File) => {
  if (file.mimetype.startsWith('image/')) return true;

  const lowerName = file.originalname.toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].some((extension) =>
    lowerName.endsWith(extension)
  );
};

const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (isSupportedImage(file)) {
    cb(null, true);
    return;
  }
  cb(new Error('Apenas arquivos de imagem são permitidos.'));
};

export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});