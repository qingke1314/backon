import express from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// 收藏文章
router.post("/posts/:postId/favorite", authenticateToken, async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.user.userId;

  if (isNaN(postId)) {
    return res.status(400).json({ error: "无效的文章 ID" });
  }

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ error: "文章未找到" });
    }

    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_postId: {
          userId: userId,
          postId: postId,
        },
      },
    });

    if (existingFavorite) {
      return res.status(200).json({ message: "文章已收藏", success: true, alreadyFavorited: true });
    }

    await prisma.favorite.create({
      data: {
        userId: userId,
        postId: postId,
      },
    });

    res.status(201).json({ message: "文章收藏成功", success: true });
  } catch (error) {
    console.error(`收藏文章 (ID: ${postId}) 失败:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: "操作冲突，文章可能已被收藏" });
    }
    res.status(500).json({ error: "收藏文章过程中发生错误" });
  }
});

// 取消收藏
router.delete("/posts/:postId/favorite", authenticateToken, async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.user.userId;

  if (isNaN(postId)) {
    return res.status(400).json({ error: "无效的文章 ID" });
  }

  try {
    const deleteResult = await prisma.favorite.deleteMany({
      where: {
        userId: userId,
        postId: postId,
      },
    });

    if (deleteResult.count === 0) {
      return res.status(404).json({ error: "收藏记录未找到或已被取消" });
    }

    res.status(200).json({ message: "文章取消收藏成功", success: true });
  } catch (error) {
    console.error(`取消收藏文章 (ID: ${postId}) 失败:`, error);
    res.status(500).json({ error: "取消收藏文章过程中发生错误" });
  }
});

export default router; 