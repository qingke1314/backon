"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PostsService = class PostsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAllPosts(currentUserId, query) {
        const { isFavorited: isFavoritedQuery, authorId: authorIdQuery, published: publishedQuery, lastEditedAfter: lastEditedAfterQuery, } = query;
        const coreVisibilityConditions = {
            OR: [{ published: true }, { published: false, authorId: currentUserId }],
        };
        const additionalFilters = [];
        if (isFavoritedQuery !== undefined) {
            if (isFavoritedQuery === "true") {
                additionalFilters.push({
                    favoritedBy: { some: { userId: currentUserId } },
                });
            }
            else if (isFavoritedQuery === "false") {
                additionalFilters.push({
                    favoritedBy: { none: { userId: currentUserId } },
                });
            }
        }
        if (authorIdQuery !== undefined) {
            const parsedAuthorId = parseInt(authorIdQuery, 10);
            if (isNaN(parsedAuthorId)) {
                throw new common_1.BadRequestException("无效的 authorId 查询参数格式");
            }
            additionalFilters.push({ authorId: parsedAuthorId });
        }
        if (publishedQuery !== undefined) {
            additionalFilters.push({ published: publishedQuery === "true" });
        }
        if (lastEditedAfterQuery !== undefined) {
            const timestamp = Number(lastEditedAfterQuery);
            if (isNaN(timestamp)) {
                throw new common_1.BadRequestException("无效的 lastEditedAfter 时间戳格式");
            }
            const dateFilter = new Date(timestamp);
            if (isNaN(dateFilter.getTime())) {
                throw new common_1.BadRequestException("无效的 lastEditedAfter 时间戳值，无法转换为有效日期");
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
            ...post,
            isUserOwner: post.authorId === currentUserId,
            isFavoritedByCurrentUser: post.favoritedBy && post.favoritedBy.length > 0,
        }));
    }
    async getPostById(id, currentUserId) {
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
                throw new common_1.NotFoundException("文章未找到");
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
                isFavoritedByCurrentUser: postFromDb.favoritedBy && postFromDb.favoritedBy.length > 0,
            };
        }
        catch (error) {
            if (error.code === "P2023") {
                throw new common_1.BadRequestException("无效的文章ID格式");
            }
            throw error;
        }
    }
    async createPost(userId, data) {
        if (!data.title || !data.content) {
            throw new common_1.BadRequestException("标题和内容不可为空!");
        }
        const now = new Date();
        let previewTextValue = "";
        if (data.content) {
            const plainContent = data.content.replace(/<[^>]*>/g, "");
            if (plainContent.length > 20) {
                previewTextValue = plainContent.substring(0, 20) + "...";
            }
            else {
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
    async updatePost(id, userId, data) {
        try {
            const post = await this.prisma.post.findUnique({
                where: { id },
            });
            if (!post) {
                throw new common_1.NotFoundException("文章未找到");
            }
            if (post.authorId !== userId) {
                if (data.title !== undefined ||
                    data.content !== undefined ||
                    data.published !== undefined ||
                    data.previewText !== undefined) {
                    throw new common_1.ForbiddenException("无权限修改此文章的核心内容");
                }
            }
            const updateData = {};
            if (data.title !== undefined)
                updateData["title"] = data.title;
            if (data.published !== undefined)
                updateData["published"] = data.published;
            if (data.content !== undefined) {
                updateData["content"] = data.content;
                const plainContent = data.content.replace(/<[^>]*>/g, "");
                if (plainContent.trim() === "") {
                    updateData["previewText"] = "";
                }
                else {
                    updateData["previewText"] =
                        plainContent.length > 20
                            ? plainContent.substring(0, 20) + "..."
                            : plainContent;
                }
            }
            else if (data.previewText !== undefined) {
                updateData["previewText"] = data.previewText;
            }
            if (Object.keys(updateData).length === 0) {
                throw new common_1.BadRequestException("未提供任何需要更新的字段");
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
        }
        catch (error) {
            if (error.code === "P2023") {
                throw new common_1.BadRequestException("无效的文章ID格式");
            }
            throw error;
        }
    }
    async deletePost(id, userId) {
        try {
            const post = await this.prisma.post.findUnique({
                where: { id },
            });
            if (!post) {
                throw new common_1.NotFoundException("文章未找到");
            }
            if (post.authorId !== userId) {
                throw new common_1.ForbiddenException("无权限删除此文章");
            }
            await this.prisma.post.delete({
                where: { id },
            });
            return {
                message: "文章删除成功",
                success: true,
            };
        }
        catch (error) {
            if (error.code === "P2023") {
                throw new common_1.BadRequestException("无效的文章ID格式");
            }
            else if (error.code === "P2025") {
                throw new common_1.NotFoundException("文章未找到或已被删除");
            }
            throw error;
        }
    }
    async favoritePost(postId, userId) {
        try {
            const post = await this.prisma.post.findUnique({ where: { id: postId } });
            if (!post) {
                throw new common_1.NotFoundException("文章未找到");
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
        }
        catch (error) {
            if (error.code === "P2002") {
                throw new common_1.ConflictException("操作冲突，文章可能已被收藏");
            }
            throw error;
        }
    }
    async unfavoritePost(postId, userId) {
        try {
            const deleteResult = await this.prisma.favorite.deleteMany({
                where: {
                    userId: userId,
                    postId: postId,
                },
            });
            if (deleteResult.count === 0) {
                throw new common_1.NotFoundException("收藏记录未找到或已被取消");
            }
            return {
                message: "文章取消收藏成功",
                success: true,
            };
        }
        catch (error) {
            throw error;
        }
    }
    async getComments(postId) {
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
        }
        catch (error) {
            throw error;
        }
    }
    async createComment(postId, userId, content) {
        if (!content) {
            throw new common_1.BadRequestException("评论内容不能为空");
        }
        try {
            const post = await this.prisma.post.findUnique({
                where: { id: postId },
            });
            if (!post) {
                throw new common_1.NotFoundException("文章不存在");
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
        }
        catch (error) {
            throw error;
        }
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PostsService);
//# sourceMappingURL=posts.service.js.map