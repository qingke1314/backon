import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// 获取文章评论
router.get("/posts/:postId/comments", async (req, res) => {
  const postId = parseInt(req.params.postId, 10);

  if (isNaN(postId)) {
    return res.status(400).json({ error: "无效的文章 ID" });
  }

  try {
    const comments = await prisma.comment.findMany({
      where: {
        postId: postId,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(comments);
  } catch (error) {
    console.error("获取评论失败:", error);
    res.status(500).json({ error: "获取评论列表过程中发生错误" });
  }
});

// 创建评论
router.post("/posts/:postId/comments", authenticateToken, async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const { content } = req.body;

  if (isNaN(postId)) {
    return res.status(400).json({ error: "无效的文章 ID" });
  }
  if (!content) {
    return res.status(400).json({ error: "评论内容不能为空" });
  }

  try {
    const authorId = req.user.userId;

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      return res.status(404).json({ error: "文章不存在" });
    }

    const newComment = await prisma.comment.create({
      data: {
        content: content,
        post: {
          connect: { id: postId },
        },
        author: {
          connect: { id: authorId },
        },
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json(newComment);
  } catch (error) {
    console.error("创建评论失败:", error);
    res.status(500).json({ error: "创建评论过程中发生错误" });
  }
});

export default router; 