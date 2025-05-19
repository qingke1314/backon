import express from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// 获取所有文章
router.get("/getAll", authenticateToken, async (req, res) => {
  try {
    const {
      isFavorited: isFavoritedQuery,
      authorId: authorIdQuery,
      published: publishedQuery,
      lastEditedAfter: lastEditedAfterQuery,
    } = req.query;

    const currentUserId = req.user.userId;

    const coreVisibilityConditions = {
      OR: [
        { published: true },
        { published: false, authorId: currentUserId },
      ],
    };

    const additionalFilters = [];

    if (isFavoritedQuery !== undefined) {
      if (isFavoritedQuery === 'true') {
        additionalFilters.push({ favoritedBy: { some: { userId: currentUserId } } });
      } else if (isFavoritedQuery === 'false') {
        additionalFilters.push({ favoritedBy: { none: { userId: currentUserId } } });
      }
    }

    if (authorIdQuery !== undefined) {
      const parsedAuthorId = parseInt(authorIdQuery, 10);
      if (isNaN(parsedAuthorId)) {
        return res.status(400).json({ error: "无效的 authorId 查询参数格式" });
      }
      additionalFilters.push({ authorId: parsedAuthorId });
    }

    if (publishedQuery !== undefined) {
      additionalFilters.push({ published: publishedQuery === 'true' });
    }

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

    const whereClause = {
      AND: [coreVisibilityConditions, ...additionalFilters],
    };

    const postsFromDb = await prisma.post.findMany({
      where: whereClause,
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
        favoritedBy: {
          where: {
            userId: currentUserId,
          },
          select: {
            userId: true,
          }
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const postsWithDerivedFields = postsFromDb.map(post => ({
      id: post.id,
      title: post.title,
      published: post.published,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      lastEditedAt: post.lastEditedAt,
      previewText: post.previewText,
      authorId: post.authorId,
      author: post.author,
      categories: post.categories,
      comments: post.comments,
      isUserOwner: post.authorId === currentUserId,
      isFavoritedByCurrentUser: post.favoritedBy && post.favoritedBy.length > 0,
    }));

    res.json(postsWithDerivedFields);
  } catch (error) {
    console.error("获取文章失败:", error);
    res.status(500).json({ error: "无法获取文章列表" });
  }
});

// 获取单篇文章
router.get("/:id", authenticateToken, async (req, res) => {
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
        comments: true,
        favoritedBy: {
          where: {
            userId: req.user.userId,
          },
          select: {
            userId: true,
          },
        },
      },
    });

    if (!postFromDb) {
      return res.status(404).json({ error: "文章未找到" });
    }

    const currentUserId = req.user.userId;
    const responsePost = {
      id: postFromDb.id,
      title: postFromDb.title,
      content: postFromDb.content,
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
    };

    res.json(responsePost);
  } catch (error) {
    console.error(`获取文章 (ID: ${id}) 失败:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2023") {
      return res.status(400).json({ error: "无效的文章ID格式" });
    }
    res.status(500).json({ error: "获取文章详情过程中发生错误" });
  }
});

// 创建文章
router.post("/add", authenticateToken, async (req, res) => {
  const { title, content, published } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "标题和内容不可为空!" });
  }
  try {
    const userId = req.user.userId;
    const now = new Date();

    let previewTextValue = "";
    if (content) {
      const plainContent = content.replace(/<[^>]*>/g, "");
      if (plainContent.length > 20) {
        previewTextValue = plainContent.substring(0, 20) + "...";
      } else {
        previewTextValue = plainContent;
      }
    }

    const newPost = await prisma.post.create({
      data: {
        title,
        content,
        published: published ?? false,
        author: {
          connect: { id: userId },
        },
        createdAt: now,
        lastEditedAt: now,
        previewText: previewTextValue,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        categories: true,
      },
    });

    const responsePost = {
      ...newPost,
      isUserOwner: true,
    };

    res.status(201).json({
      message: published ? "发布成功" : "新增成功",
      status: 201,
      success: true,
      data: responsePost,
    });
  } catch (error) {
    console.error("创建文章失败：", error);
    res.status(500).json({ error: "创建文章过程中发生错误" });
  }
});

// 编辑文章
router.patch("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
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

    if (post.authorId !== userId) {
      if (title !== undefined || content !== undefined || published !== undefined || previewText !== undefined) {
        return res.status(403).json({ error: "无权限修改此文章的核心内容" });
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (published !== undefined) updateData.published = published;

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

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "未提供任何需要更新的字段" });
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

    const responsePost = {
      ...updatedPost,
      isUserOwner: updatedPost.authorId === userId,
    };

    res.status(200).json({
      message: "更新成功",
      status: 200,
      success: true,
      data: responsePost,
    });
  } catch (error) {
    console.error(`编辑文章 (ID: ${id}) 失败:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2023") {
      return res.status(400).json({ error: "无效的文章ID格式" });
    }
    res.status(500).json({ error: "编辑文章过程中发生错误" });
  }
});

// 删除文章
router.delete("/:id", authenticateToken, async (req, res) => {
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2023") {
      return res.status(400).json({ error: "无效的文章ID格式" });
    } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ error: "文章未找到或已被删除" });
    }
    res.status(500).json({ error: "删除文章过程中发生错误" });
  }
});

export default router; 