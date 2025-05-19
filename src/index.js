import express from "express";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

// 导入路由
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import { editorUpload } from './config/multer.js';

dotenv.config();
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not defined in the environment variables");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();
const prisma = new PrismaClient();

// 配置 Express 静态服务 public 目录
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 富文本编辑器图片上传接口
app.post('/api/upload-image-custom', editorUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  const imageUrl = `http://localhost:3000/public/uploads/editor/${req.file.filename}`;
  res.json({ location: imageUrl });
});

// 注册路由
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/', commentRoutes);
app.use('/', favoriteRoutes);

// 在应用关闭时断开 Prisma 连接
process.on("beforeExit", async () => {
  await prisma.$disconnect();
  console.log("Prisma Client disconnected.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server is running on http://0.0.0.0:${PORT} and accessible on your local network`
  );
});
