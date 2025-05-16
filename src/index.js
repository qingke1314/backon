import express from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url'; // 用于获取当前文件的绝对路径

dotenv.config();
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not defined in the environment variables");
  process.exit(1);
}

// ESM 环境下获取 __dirname 的等价物
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();
const prisma = new PrismaClient();

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置 Express 静态服务 public 目录
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 解析URL-encoded数据

// Multer 文件存储配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir); // 保存到 'public/uploads/avatars/'
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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

// 初始化 Multer upload 实例
const upload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 2 // 限制文件大小为 2MB (可选)
  }
}).single('avatarFile'); // 'avatarFile' 必须与前端 el-upload 的 name 属性一致

// Middleware for token authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // Unauthorized if no token
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(401); // Forbidden if token is not valid
    }
    req.user = user; // Add payload to request
    next(); // Proceed to the next middleware or route handler
  });
};

app.post("/validateToken", authenticateToken, async (req, res) => {
  // 如果 authenticateToken 成功，req.user 就包含了用户信息
  // 直接使用 req.user 来生成新 token 和响应
  const payload = { userId: req.user.userId, email: req.user.email };
  // 重新生成 token
  const newToken = jwt.sign(
    payload,
    process.env.JWT_SECRET, // 从环境变量中获取密钥
    { expiresIn: "1d" } // 设置 token 有效期，例如 1 天
  );
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.userId },
  });
  res.status(200).json({
    success: true,
    token: newToken,
    user: {
      // 返回用户部分信息，不包括密码哈希
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      avatar: currentUser.avatar,
      phoneNumber: currentUser.phoneNumber,
    },
  });
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

/**
 * 获取所有文章
 */
app.get("/posts/getAll", authenticateToken, async (req, res) => {
  try {
    // 从查询参数中获取过滤条件，并重命名以区分
    const {
      isFavorited: isFavoritedQuery,
      authorId: authorIdQuery,
      published: publishedQuery,
      lastEditedAfter: lastEditedAfterQuery,
    } = req.query;

    const currentUserId = req.user.userId; // 获取当前登录用户的ID

    // 核心可见性规则：
    // 1. 文章已发布，或
    // 2. 文章是草稿且作者是当前用户
    const coreVisibilityConditions = {
      OR: [
        { published: true },
        { published: false, authorId: currentUserId },
      ],
    };

    const additionalFilters = []; // 用于存放来自查询参数的额外过滤条件

    // 处理 isFavorited 查询参数 (根据当前用户是否收藏来过滤)
    if (isFavoritedQuery !== undefined) {
      if (isFavoritedQuery === 'true') {
        additionalFilters.push({ favoritedBy: { some: { userId: currentUserId } } });
      } else if (isFavoritedQuery === 'false') {
        additionalFilters.push({ favoritedBy: { none: { userId: currentUserId } } });
      }
    }

    // 处理 authorId 查询参数 (显式按作者ID过滤)
    if (authorIdQuery !== undefined) {
      const parsedAuthorId = parseInt(authorIdQuery, 10);
      if (isNaN(parsedAuthorId)) {
        return res.status(400).json({ error: "无效的 authorId 查询参数格式" });
      }
      additionalFilters.push({ authorId: parsedAuthorId });
    }

    // 处理 published 查询参数 (显式按发布状态过滤)
    if (publishedQuery !== undefined) {
      additionalFilters.push({ published: publishedQuery === 'true' });
    }

    // 处理 lastEditedAfter 查询参数
    if (lastEditedAfterQuery !== undefined) {
      const timestamp = Number(lastEditedAfterQuery);
      if (isNaN(timestamp)) {
        return res.status(400).json({ error: "无效的 lastEditedAfter 时间戳格式" });
      }
      const dateFilter = new Date(timestamp);
      if (isNaN(dateFilter.getTime())) {
        return res.status(400).json({ error: "无效的 lastEditedAfter 时间戳值，无法转换为有效日期" });
      }
      additionalFilters.push({ lastEditedAt: { gt: dateFilter } });
    }

    // 组合核心可见性规则和额外过滤条件
    const whereClause = {
      AND: [coreVisibilityConditions, ...additionalFilters],
    };

    // 使用 Prisma Client 查询数据库获取文章
    const postsFromDb = await prisma.post.findMany({
      where: whereClause, // 应用组合后的过滤条件
      include: { // 使用 include 来获取 favoritedBy 关联，以便后续处理
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
        favoritedBy: { // 包含收藏信息，限定为当前用户的收藏
          where: {
            userId: currentUserId,
          },
          select: {
            userId: true, // 只需要知道是否存在即可
          }
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 为每篇文章添加 isUserOwner 和 isFavoritedByCurrentUser 字段
    const postsWithDerivedFields = postsFromDb.map(post => ({
      // 手动选择需要的字段，因为我们移除了顶层 select
      id: post.id,
      title: post.title,
      published: post.published,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      lastEditedAt: post.lastEditedAt,
      previewText: post.previewText,
      authorId: post.authorId,
      author: post.author, // 来自 include
      categories: post.categories, // 来自 include
      comments: post.comments, // 如果之前有 comments，也需要手动包含或通过 include 获取
      isUserOwner: post.authorId === currentUserId,
      isFavoritedByCurrentUser: post.favoritedBy && post.favoritedBy.length > 0,
    }));

    res.json(postsWithDerivedFields);
  } catch (error) {
    console.error("获取文章失败:", error);
    res.status(500).json({ error: "无法获取文章列表" });
  }
});

/**
 * 通过 ID 获取单篇文章
 */
app.get("/posts/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const postFromDb = await prisma.post.findUnique({
      where: { id: parseInt(id) },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: true, // 假设需要包含评论信息
        favoritedBy: { // 包含收藏信息，限定为当前用户的收藏
          where: {
            userId: req.user.userId, // 直接使用 req.user.userId
          },
          select: {
            userId: true, // 只需要知道是否存在即可
          },
        },
      },
    });

    if (!postFromDb) {
      return res.status(404).json({ error: "文章未找到" });
    }

    const currentUserId = req.user.userId;
    const responsePost = {
      // 手动选择需要的字段，并添加衍生字段
      id: postFromDb.id,
      title: postFromDb.title,
      content: postFromDb.content, // 单篇文章通常会返回完整 content
      published: postFromDb.published,
      createdAt: postFromDb.createdAt,
      updatedAt: postFromDb.updatedAt,
      lastEditedAt: postFromDb.lastEditedAt,
      previewText: postFromDb.previewText,
      authorId: postFromDb.authorId,
      author: postFromDb.author,
      categories: postFromDb.categories,
      comments: postFromDb.comments,
      isUserOwner: postFromDb.authorId === currentUserId,
      isFavoritedByCurrentUser: postFromDb.favoritedBy && postFromDb.favoritedBy.length > 0,
      // favoritedBy: postFromDb.favoritedBy, // 原始收藏者列表，通常不在单篇详情中直接暴露
    };

    res.json(responsePost);
  } catch (error) {
    console.error(`获取文章 (ID: ${id}) 失败:`, error);
    // Differentiate between 'not found' due to invalid ID format vs. actual not found
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2023"
    ) {
      // Error converting an invalid ID format like "abc" to a number for the query
      return res.status(400).json({ error: "无效的文章ID格式" });
    }
    res.status(500).json({ error: "获取文章详情过程中发生错误" });
  }
});

/**
 * 创建文章
 */
app.post("/posts/add", authenticateToken, async (req, res) => {
  const { title, content, published } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "标题和内容不可为空!" });
  }
  try {
    const userId = req.user.userId;
    const now = new Date(); // 获取当前时间

    let previewTextValue = "";
    if (content) {
      const plainContent = content.replace(/<[^>]*>/g, ""); // 去除HTML标签
      if (plainContent.length > 20) {
        previewTextValue = plainContent.substring(0, 20) + "...";
      } else {
        previewTextValue = plainContent;
      }
    }

    const newPost = await prisma.post.create({
      data: {
        title,
        content, // 原始内容（包含HTML）仍然保存到数据库
        published: published ?? false,
        author: {
          connect: { id: userId },
        },
        createdAt: now,
        lastEditedAt: now,
        previewText: previewTextValue, // 基于去除HTML后的内容生成previewText
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        categories: true, // 包含分类信息
      },
    });

    // 为响应添加 isUserOwner 字段 (对于新创建的帖子，作者总是当前用户)
    const responsePost = {
      ...newPost,
      isUserOwner: true, // 或者 newPost.authorId === userId，但这里肯定是 true
    };

    res.status(201).json({
      message: published ? "发布成功" : "新增成功",
      status: 201,
      success: true,
      data: responsePost, // 返回带有 isUserOwner 的文章数据
    });
  } catch (error) {
    console.error("创建文章失败：", error);
    res.status(500).json({ error: "创建文章过程中发生错误" });
  }
});

/**
 * 编辑文章 (部分更新)
 * To withdraw an article, send { "published": false }
 */
app.patch("/posts/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  // 从请求体中解构出可能需要更新的字段
  // isFavorited 已被移除，因为它现在通过 Favorite 表管理
  const { title, content, published, previewText } = req.body;

  try {
    const postId = parseInt(id);
    if (isNaN(postId)) {
      return res.status(400).json({ error: "无效的文章ID格式" });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: "文章未找到" });
    }

    // 权限检查：只有作者才能编辑自己的文章的主要内容
    // 收藏状态的修改将通过新的专用接口处理，不由作者权限限制
    if (post.authorId !== userId) {
      // 如果不是作者，检查是否只尝试修改非作者限制字段（未来可能添加，当前没有）
      // 如果尝试修改 title, content, published, previewText 等核心字段，则拒绝
      if (title !== undefined || content !== undefined || published !== undefined || previewText !== undefined) {
        return res.status(403).json({ error: "无权限修改此文章的核心内容" });
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (published !== undefined) updateData.published = published;
    // if (isFavorited !== undefined) updateData.isFavorited = isFavorited; // 旧逻辑，已移除

    if (content !== undefined) {
      updateData.content = content;
      const plainContent = content.replace(/<[^>]*>/g, "");
      if (plainContent.trim() === "") {
        updateData.previewText = "";
      } else {
        updateData.previewText = plainContent.length > 20 ? plainContent.substring(0, 20) + "..." : plainContent;
      }
    } else if (previewText !== undefined) {
      updateData.previewText = previewText;
    }

    // 如果没有任何实际要更新的字段（除了收藏状态，它现在分开处理）
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "未提供任何需要更新的字段（收藏状态请使用专用接口）" });
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        author: {
          select: { id: true, name: true },
        },
        categories: {
          select: { id: true, name: true },
        },
      },
    });

    // 为响应添加 isUserOwner 字段
    const responsePost = {
      ...updatedPost,
      isUserOwner: updatedPost.authorId === userId, // userId 是当前登录用户的ID
    };

    res.status(200).json({
      message: "更新成功",
      status: 200,
      success: true,
      data: responsePost, // 返回带有 isUserOwner 的文章数据
    });
  } catch (error) {
    console.error(`编辑文章 (ID: ${id}) 失败:`, error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2023"
    ) {
      return res.status(400).json({ error: "无效的文章ID格式" });
    }
    res.status(500).json({ error: "编辑文章过程中发生错误" });
  }
});

/**
 * 删除文章
 */
app.delete("/posts/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const postId = parseInt(id);
    if (isNaN(postId)) {
      return res.status(400).json({ error: "无效的文章ID格式" });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: "文章未找到" });
    }

    if (post.authorId !== userId) {
      return res.status(403).json({ error: "无权限删除此文章" });
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    res.status(200).json({ message: "文章删除成功", success: true });
  } catch (error) {
    console.error(`删除文章 (ID: ${id}) 失败:`, error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2023"
    ) {
      return res.status(400).json({ error: "无效的文章ID格式" });
    } else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      // This can happen if the post was deleted by another request between findUnique and delete
      return res.status(404).json({ error: "文章未找到或已被删除" });
    }
    res.status(500).json({ error: "删除文章过程中发生错误" });
  }
});

// POST /users - 用户注册接口
app.post("/users", async (req, res) => {
  const { email, name, password } = req.body;

  // 1. 数据校验 (基本示例，实际应用中需要更完善的校验)
  if (!email || !password) {
    return res.status(400).json({ error: "邮箱和密码是必需的" });
  }
  // 邮箱格式校验
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "邮箱格式不正确" });
  }
  try {
    // 2. 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });
    if (existingUser) {
      // 返回 409 Conflict 表示资源冲突 (邮箱已存在)
      return res.status(409).json({ error: "该邮箱已被注册" });
    }
    // 3. 加密密码
    // genSaltSync(10) 中的 10 是 saltRounds，值越大，加密越安全，但耗时越长，通常在 10-12 之间
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // 4. 创建新用户
    const newUser = await prisma.user.create({
      data: {
        email: email,
        name: name, // name 可以是可选的
        password: hashedPassword, // 存储加密后的密码
      },
      select: {
        // 选择只返回用户的部分信息，不包括密码哈希
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    // 5. 注册成功，返回新用户的信息
    // 通常注册成功后会让用户登录，或者直接返回一个用于自动登录的 token
    // 这里我们只返回用户信息，登录流程单独处理
    res.status(201).json({
      message: "注册成功",
      status: 201,
      success: true,
      data: newUser,
    }); // 201 Created
  } catch (error) {
    console.error("用户注册失败:", error);
    res.status(500).json({ error: "用户注册过程中发生错误" });
  }
});

// POST /login - 用户登录接口
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  // 1. 数据校验
  if (!email || !password) {
    return res.status(400).json({ error: "邮箱和密码是必需的" });
  }
  try {
    // 2. 查找用户
    const user = await prisma.user.findUnique({
      where: { email: email },
    });
    // 3. 检查用户是否存在
    if (!user) {
      // 出于安全考虑，不应该暴露是用户名不存在还是密码错误
      return res.status(405).json({ message: "用户未注册" }); // 401 Unauthorized
    }
    // 4. 比对密码
    // 比较用户输入的密码和数据库中存储的加密密码
    const isMatch = await bcrypt.compare(password, user.password);
    // 5. 检查密码是否匹配
    if (!isMatch) {
      return res.status(405).json({ message: "邮箱或密码不正确" }); // 401 Unauthorized
    }
    // 6. 密码匹配，生成 JWT Token
    // token 中通常包含用户 ID 和其他非敏感信息
    const payload = { userId: user.id, email: user.email };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET, // 从环境变量中获取密钥
      { expiresIn: "1d" } // 设置 token 有效期，例如 1 天
    );
    // 7. 登录成功，返回 token 和用户部分信息
    res.status(200).json({
      success: true,
      token: token,
      user: {
        // 返回用户部分信息，不包括密码哈希
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    console.error("用户登录失败:", error);
    res.status(500).json({ error: "用户登录过程中发生错误" });
  }
});

// POST /users/change-password - 修改当前登录用户密码
app.post("/users/changePassword", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { oldPassword, newPassword } = req.body;

  // 1. 数据校验
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "旧密码和新密码是必需的" });
  }

  // 可选：添加新密码复杂度校验，例如长度
  if (newPassword.length < 6) { // 假设最小长度为6
    return res.status(400).json({ error: "新密码长度至少为6位" });
  }

  try {
    // 2. 查找用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    //理论上 authenticateToken 已经确保用户存在，但作为安全检查
    if (!user) {
      return res.status(404).json({ error: "用户未找到" });
    }

    // 3. 比对旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "旧密码不正确" });
    }

    // 4. 加密新密码
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // 5. 更新用户密码
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    res.status(200).json({ message: "密码修改成功", success: true });

  } catch (error) {
    console.error("修改密码失败:", error);
    res.status(500).json({ error: "修改密码过程中发生错误" });
  }
});

// GET /posts/:postId/comments - 获取指定文章的所有评论 (通常不需要登录)
app.get("/posts/:postId/comments", async (req, res) => {
  const postId = parseInt(req.params.postId, 10); // 从 URL 参数获取文章 ID

  // 1. 校验文章 ID
  if (isNaN(postId)) {
    return res.status(400).json({ error: "无效的文章 ID" });
  }

  try {
    // 2. 使用 Prisma Client 查询指定文章下的所有评论
    const comments = await prisma.comment.findMany({
      where: {
        postId: postId,
      },
      include: {
        // 包含评论作者的信息
        author: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        // 按创建时间升序排列评论
        createdAt: "asc",
      },
    });

    // 3. 返回评论列表
    res.json(comments);
  } catch (error) {
    console.error("获取评论失败:", error);
    res.status(500).json({ error: "获取评论列表过程中发生错误" });
  }
});

// POST /posts/:postId/comments - 在指定文章下发表新评论 (需要登录)
app.post("/posts/:postId/comments", authenticateToken, async (req, res) => {
  const postId = parseInt(req.params.postId, 10); // 从 URL 参数获取文章 ID
  const { content } = req.body; // 从请求体获取评论内容

  // 1. 校验文章 ID 和评论内容
  if (isNaN(postId)) {
    return res.status(400).json({ error: "无效的文章 ID" });
  }
  if (!content) {
    return res.status(400).json({ error: "评论内容不能为空" });
  }
  // TODO: 可以在这里添加评论内容长度等校验

  try {
    // 2. 获取当前登录用户的 ID (由 authenticateToken 中间件提供)
    const authorId = req.user.userId;

    // 3. 检查文章是否存在 (可选但推荐，避免在不存在的文章下创建评论)
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      return res.status(404).json({ error: "文章不存在" });
    }

    // 4. 创建新评论
    const newComment = await prisma.comment.create({
      data: {
        content: content,
        post: {
          // 连接到所属文章
          connect: { id: postId },
        },
        author: {
          // 连接到评论作者
          connect: { id: authorId },
        },
      },
      include: {
        // 返回新创建评论的同时包含作者信息
        author: {
          select: { id: true, name: true },
        },
      },
    });

    // 5. 返回创建成功的评论信息
    res.status(201).json(newComment); // 201 Created
  } catch (error) {
    console.error("创建评论失败:", error);
    res.status(500).json({ error: "创建评论过程中发生错误" });
  }
});

// POST /posts/:postId/favorite - 收藏一篇文章
app.post("/posts/:postId/favorite", authenticateToken, async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.user.userId;

  if (isNaN(postId)) {
    return res.status(400).json({ error: "无效的文章 ID" });
  }

  try {
    // 1. 检查文章是否存在
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ error: "文章未找到" });
    }

    // 2. 检查是否已收藏 (避免重复收藏)
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_postId: { // 使用在 Favorite 模型中定义的 @@id([userId, postId])
          userId: userId,
          postId: postId,
        },
      },
    });

    if (existingFavorite) {
      return res.status(200).json({ message: "文章已收藏", success: true, alreadyFavorited: true });
    }

    // 3. 创建收藏记录
    await prisma.favorite.create({
      data: {
        userId: userId,
        postId: postId,
      },
    });

    res.status(201).json({ message: "文章收藏成功", success: true });
  } catch (error) {
    console.error(`收藏文章 (ID: ${postId}) 失败:`, error);
    // 处理 Prisma 特有的错误，例如 P2002 代表唯一约束失败
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // 虽然我们已经检查了 existingFavorite，但作为双重保险
      return res.status(409).json({ error: "操作冲突，文章可能已被收藏" });
    }
    res.status(500).json({ error: "收藏文章过程中发生错误" });
  }
});

// DELETE /posts/:postId/favorite - 取消收藏一篇文章
app.delete("/posts/:postId/favorite", authenticateToken, async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.user.userId;

  if (isNaN(postId)) {
    return res.status(400).json({ error: "无效的文章 ID" });
  }

  try {
    // 尝试删除收藏记录。
    // Prisma 的 deleteMany 在找不到匹配项时不会抛错，而是返回 count: 0。
    // 对于复合主键，也可以使用 prisma.favorite.delete({ where: { userId_postId: { userId, postId } } })
    // 但 delete 在找不到记录时会抛出 P2025 错误，需要额外捕获。deleteMany 更直接。
    const deleteResult = await prisma.favorite.deleteMany({
      where: {
        userId: userId,
        postId: postId,
      },
    });

    if (deleteResult.count === 0) {
      // 如果没有记录被删除，说明用户之前未收藏该文章或已被取消
      return res.status(404).json({ error: "收藏记录未找到或已被取消" });
    }

    res.status(200).json({ message: "文章取消收藏成功", success: true });
  } catch (error) {
    console.error(`取消收藏文章 (ID: ${postId}) 失败:`, error);
    res.status(500).json({ error: "取消收藏文章过程中发生错误" });
  }
});

// PUT /users/profile - 修改当前登录用户信息
app.patch("/users/profile", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { name, avatar, phoneNumber } = req.body;

  // 构建需要更新的数据对象
  const updateData = {};
  if (name !== undefined) {
    updateData.name = name;
  }
  if (avatar !== undefined) {
    // 校验 avatar 是否为有效的 URL (以 http 或 / 开头) 或空字符串/null
    if (avatar === "" || avatar === null ||
        (typeof avatar === 'string' && (avatar.startsWith('http') || avatar.startsWith('/')))) {
      updateData.avatar = avatar; // 允许空字符串或 null 来清除头像
    } else {
        return res.status(400).json({ error: "头像链接格式不正确，应为有效的URL或相对路径，或为空以清除头像" });
    }
  }
  if (phoneNumber !== undefined) {
    // 简单校验手机号格式或置空
    // 你可能需要更复杂的手机号校验逻辑
    if (phoneNumber === "" || (typeof phoneNumber === 'string' && /^[0-9+-]*$/.test(phoneNumber))) {
      updateData.phoneNumber = phoneNumber;
    } else if (phoneNumber !== null) { // 允许 null 来清除
      return res.status(400).json({ error: "手机号码格式不正确" });
    }
  }

  // 如果没有提供任何可更新的字段
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "未提供任何需要更新的信息" });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        // 选择返回更新后的用户信息，不包括密码哈希
        id: true,
        email: true,
        name: true,
        avatar: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true, // Prisma 会自动更新 updatedAt
      },
    });

    res.status(200).json({
      message: "用户信息更新成功",
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("更新用户信息失败:", error);
    // 处理可能的 Prisma 错误，例如用户不存在 (虽然理论上 authenticateToken 会保证用户存在)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ error: "用户未找到" });
    }
    res.status(500).json({ error: "更新用户信息过程中发生错误" });
  }
});

// POST /users/upload-avatar - 用户上传头像接口
app.post("/users/upload-avatar", authenticateToken, (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: "文件过大，最大允许 5MB" });
      }
      return res.status(400).json({ success: false, message: `Multer错误: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "请选择要上传的图片文件" });
    }
    const userId = req.user.userId;
    const fileUrl = `http://localhost:3000/uploads/avatars/${req.file.filename}`;

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { avatar: fileUrl }
      });

      res.status(200).json({
        success: true,
        data: { url: fileUrl },
        message: "头像上传成功"
      });
    } catch (dbError) {
      console.error("更新用户头像URL失败:", dbError);
      // 可选: 删除已上传的文件以避免孤立文件
      // fs.unlink(req.file.path, (unlinkErr) => {
      //   if (unlinkErr) console.error("删除文件失败:", unlinkErr);
      // });
      res.status(500).json({ success: false, message: "服务器内部错误，更新头像信息失败" });
    }
  });
});

// 在应用关闭时断开 Prisma 连接 (可选，但推荐)
process.on("beforeExit", async () => {
  await prisma.$disconnect();
  console.log("Prisma Client disconnected.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server is running on http://0.0.0.0:${PORT} and accessible on your local network`
  );
});
