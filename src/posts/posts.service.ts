import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async getAllPosts(
    currentUserId: number,
    query: {
      isFavorited?: string;
      authorId?: string;
      published?: string;
      lastEditedAfter?: string;
    }
  ) {
    const {
      isFavorited: isFavoritedQuery,
      authorId: authorIdQuery,
      published: publishedQuery,
      lastEditedAfter: lastEditedAfterQuery,
    } = query;

    const coreVisibilityConditions = {
      OR: [{ published: true }, { published: false, authorId: currentUserId }],
    };

    const additionalFilters = [];

    if (isFavoritedQuery !== undefined) {
      if (isFavoritedQuery === "true") {
        additionalFilters.push({
          favoritedBy: { some: { userId: currentUserId } },
        });
      } else if (isFavoritedQuery === "false") {
        additionalFilters.push({
          favoritedBy: { none: { userId: currentUserId } },
        });
      }
    }

    if (authorIdQuery !== undefined) {
      const parsedAuthorId = parseInt(authorIdQuery, 10);
      if (isNaN(parsedAuthorId)) {
        throw new BadRequestException("无效的 authorId 查询参数格式");
      }
      additionalFilters.push({ authorId: parsedAuthorId });
    }

    if (publishedQuery !== undefined) {
      additionalFilters.push({ published: publishedQuery === "true" });
    }

    if (lastEditedAfterQuery !== undefined) {
      const timestamp = Number(lastEditedAfterQuery);
      if (isNaN(timestamp)) {
        throw new BadRequestException("无效的 lastEditedAfter 时间戳格式");
      }
      const dateFilter = new Date(timestamp);
      if (isNaN(dateFilter.getTime())) {
        throw new BadRequestException(
          "无效的 lastEditedAfter 时间戳值，无法转换为有效日期"
        );
      }
      additionalFilters.push({ lastEditedAt: { gt: dateFilter } });
    }

    const whereClause = {
      AND: [coreVisibilityConditions, ...additionalFilters],
    };

    const postsFromDb = await this.prisma.post.findMany({
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return postsFromDb.map((post) => ({
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
      isUserOwner: post.authorId === currentUserId,
      isFavoritedByCurrentUser: post.favoritedBy && post.favoritedBy.length > 0,
    }));
  }

  async getPostById(id: number, currentUserId: number) {
    try {
      const postFromDb = await this.prisma.post.findUnique({
        where: { id },
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
              userId: currentUserId,
            },
            select: {
              userId: true,
            },
          },
        },
      });

      if (!postFromDb) {
        throw new NotFoundException("文章未找到");
      }

      return {
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
        isFavoritedByCurrentUser:
          postFromDb.favoritedBy && postFromDb.favoritedBy.length > 0,
      };
    } catch (error) {
      if (error.code === "P2023") {
        throw new BadRequestException("无效的文章ID格式");
      }
      throw error;
    }
  }

  async createPost(
    userId: number,
    data: { title: string; content: string; published?: boolean }
  ) {
    if (!data.title || !data.content) {
      throw new BadRequestException("标题和内容不可为空!");
    }

    const now = new Date();
    let previewTextValue = "";
    if (data.content) {
      const plainContent = data.content.replace(/<[^>]*>/g, "");
      if (plainContent.length > 20) {
        previewTextValue = plainContent.substring(0, 20) + "...";
      } else {
        previewTextValue = plainContent;
      }
    }

    const newPost = await this.prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        published: data.published ?? false,
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

    return {
      message: newPost.published ? "发布成功" : "新增成功",
      status: 201,
      success: true,
      data: {
        ...newPost,
        isUserOwner: true,
      },
    };
  }

  async updatePost(
    id: number,
    userId: number,
    data: {
      title?: string;
      content?: string;
      published?: boolean;
      previewText?: string;
    }
  ) {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id },
      });

      if (!post) {
        throw new NotFoundException("文章未找到");
      }

      if (post.authorId !== userId) {
        if (
          data.title !== undefined ||
          data.content !== undefined ||
          data.published !== undefined ||
          data.previewText !== undefined
        ) {
          throw new ForbiddenException("无权限修改此文章的核心内容");
        }
      }

      const updateData = {};
      if (data.title !== undefined) updateData["title"] = data.title;
      if (data.published !== undefined)
        updateData["published"] = data.published;

      if (data.content !== undefined) {
        updateData["content"] = data.content;
        const plainContent = data.content.replace(/<[^>]*>/g, "");
        if (plainContent.trim() === "") {
          updateData["previewText"] = "";
        } else {
          updateData["previewText"] =
            plainContent.length > 20
              ? plainContent.substring(0, 20) + "..."
              : plainContent;
        }
      } else if (data.previewText !== undefined) {
        updateData["previewText"] = data.previewText;
      }

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException("未提供任何需要更新的字段");
      }

      const updatedPost = await this.prisma.post.update({
        where: { id },
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

      return {
        message: "更新成功",
        status: 200,
        success: true,
        data: {
          ...updatedPost,
          isUserOwner: updatedPost.authorId === userId,
        },
      };
    } catch (error) {
      if (error.code === "P2023") {
        throw new BadRequestException("无效的文章ID格式");
      }
      throw error;
    }
  }

  async deletePost(id: number, userId: number) {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id },
      });

      if (!post) {
        throw new NotFoundException("文章未找到");
      }

      if (post.authorId !== userId) {
        throw new ForbiddenException("无权限删除此文章");
      }

      await this.prisma.post.delete({
        where: { id },
      });

      return {
        message: "文章删除成功",
        success: true,
      };
    } catch (error) {
      if (error.code === "P2023") {
        throw new BadRequestException("无效的文章ID格式");
      } else if (error.code === "P2025") {
        throw new NotFoundException("文章未找到或已被删除");
      }
      throw error;
    }
  }

  async favoritePost(postId: number, userId: number) {
    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        throw new NotFoundException("文章未找到");
      }

      const existingFavorite = await this.prisma.favorite.findUnique({
        where: {
          userId_postId: {
            userId: userId,
            postId: postId,
          },
        },
      });

      if (existingFavorite) {
        return {
          message: "文章已收藏",
          success: true,
          alreadyFavorited: true,
        };
      }

      await this.prisma.favorite.create({
        data: {
          userId: userId,
          postId: postId,
        },
      });

      return {
        message: "文章收藏成功",
        success: true,
      };
    } catch (error) {
      if (error.code === "P2002") {
        throw new ConflictException("操作冲突，文章可能已被收藏");
      }
      throw error;
    }
  }

  async unfavoritePost(postId: number, userId: number) {
    try {
      const deleteResult = await this.prisma.favorite.deleteMany({
        where: {
          userId: userId,
          postId: postId,
        },
      });

      if (deleteResult.count === 0) {
        throw new NotFoundException("收藏记录未找到或已被取消");
      }

      return {
        message: "文章取消收藏成功",
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  async getComments(postId: number) {
    try {
      const comments = await this.prisma.comment.findMany({
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

      return comments;
    } catch (error) {
      throw error;
    }
  }

  async createComment(postId: number, userId: number, content: string) {
    if (!content) {
      throw new BadRequestException("评论内容不能为空");
    }

    try {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
      });
      if (!post) {
        throw new NotFoundException("文章不存在");
      }

      const newComment = await this.prisma.comment.create({
        data: {
          content: content,
          post: {
            connect: { id: postId },
          },
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

      return newComment;
    } catch (error) {
      throw error;
    }
  }
}
