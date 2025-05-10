import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import { Prisma } from "@prisma/client";

dotenv.config();
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not defined in the environment variables");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 解析URL-encoded数据

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

app.get("/", (req, res) => {
  res.send("Hello World");
});

/**
 * 获取所有文章
 */
app.get("/posts/getAll", authenticateToken, async (_req, res) => {
  try {
    // 使用 Prisma Client 查询数据库获取所有文章
    const posts = await prisma.post.findMany({
      select: {
        // Select specific fields, excluding 'content'
        id: true,
        title: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
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
        // Explicitly exclude content: content: false, // This is implicitly done by not including it in select
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    // 将查询结果以 JSON 格式返回给客户端
    res.json(posts);
  } catch (error) {
    // 捕获错误并返回错误响应
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
    const post = await prisma.post.findUnique({
      where: { id: parseInt(id) }, // Ensure id is an integer
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
        // Comments can be included here if needed
        // comments: true,
      },
    });

    if (!post) {
      return res.status(404).json({ error: "文章未找到" });
    }
    res.json(post);
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
    await prisma.post.create({
      data: {
        title,
        content,
        published: published ?? false,
        author: {
          connect: { id: userId },
        },
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });
    res.status(201).json({
      message: published ? "发布成功" : "新增成功",
      status: 201,
      success: true,
    }); // 201 Created
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
  const { title, content, published } = req.body;

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
      return res.status(403).json({ error: "无权限修改此文章" });
    }

    // Prepare data for update, only include fields that are actually provided
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (published !== undefined) updateData.published = published;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "未提供任何需要更新的字段" });
    }

    await prisma.post.update({
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

    res.status(200).json({
      message: "更新成功",
      status: 200,
      success: true,
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
  console.log(req, "req");

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
      return res.status(401).json({ error: "邮箱或密码不正确" }); // 401 Unauthorized
    }
    // 4. 比对密码
    // 比较用户输入的密码和数据库中存储的加密密码
    const isMatch = await bcrypt.compare(password, user.password);
    // 5. 检查密码是否匹配
    if (!isMatch) {
      return res.status(401).json({ error: "邮箱或密码不正确" }); // 401 Unauthorized
    }
    // 6. 密码匹配，生成 JWT Token
    // token 中通常包含用户 ID 和其他非敏感信息
    const payload = { userId: user.id, email: user.email };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET, // 从环境变量中获取密钥
      { expiresIn: "1h" } // 设置 token 有效期，例如 1 小时
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
      },
    });
  } catch (error) {
    console.error("用户登录失败:", error);
    res.status(500).json({ error: "用户登录过程中发生错误" });
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
