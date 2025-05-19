import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
const editorUploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'editor');

[uploadsDir, editorUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer 文件过滤器 (只允许图片)
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
    cb(null, true);
  } else {
    cb(new Error('仅支持上传 JPG, PNG, GIF 格式的图片!'), false);
  }
};

// 头像上传配置
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 富文本编辑器图片上传配置
const editorStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, editorUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 初始化 Multer upload 实例
export const upload = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 限制文件大小为 5MB
  }
}).single('avatarFile');

// 富文本编辑器图片上传实例
export const editorUpload = multer({
  storage: editorStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 限制文件大小为 5MB
  }
}).single('file');