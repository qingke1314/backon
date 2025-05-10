import express from 'express';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3001;

// 启用 CORS
app.use(cors());
// 配置文件存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'updates');
    console.log(uploadDir);
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });


// 文件上传接口
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有文件被上传' });
  }
  res.json({
    message: '文件上传成功',
    filename: req.file.originalname
  });
});

app.get('/', (req, res) => {
  res.send('Hello from Express backend!'); // 或者渲染一个页面
});

// 获取文件列表接口
app.get('/files', (req, res) => {
  const updatesDir = path.join(__dirname, 'updates');
  if (!fs.existsSync(updatesDir)) {
    return res.json({ files: [] });
  }
  
  const files = fs.readdirSync(updatesDir);
  res.json({ files });
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log(`上传目录: ${path.join(__dirname, 'updates')}`);
}); 