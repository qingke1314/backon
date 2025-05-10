const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 3001;

// 启用 CORS
app.use(cors());

// 配置上传目录
const UPLOAD_DIR = '/project/backon/updates';

// 确保目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 处理 PUT 请求
app.put('/updates/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOAD_DIR, filename);
  
  // 创建写入流
  const writeStream = fs.createWriteStream(filePath);
  
  // 将请求体写入文件
  req.pipe(writeStream);
  
  writeStream.on('finish', () => {
    res.status(200).json({ message: '文件上传成功' });
  });
  
  writeStream.on('error', (err) => {
    console.error('文件写入错误:', err);
    res.status(500).json({ error: '文件上传失败' });
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log(`上传目录: ${UPLOAD_DIR}`);
});