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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const posts_service_1 = require("./posts.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const get_user_decorator_1 = require("../auth/get-user.decorator");
let PostsController = class PostsController {
    constructor(postsService) {
        this.postsService = postsService;
    }
    async getAllPosts(userId, isFavorited, authorId, published, lastEditedAfter) {
        return this.postsService.getAllPosts(userId, {
            isFavorited,
            authorId,
            published,
            lastEditedAfter,
        });
    }
    async getPostById(id, userId) {
        return this.postsService.getPostById(id, userId);
    }
    async createPost(userId, data) {
        return this.postsService.createPost(userId, data);
    }
    async updatePost(id, userId, data) {
        return this.postsService.updatePost(id, userId, data);
    }
    async deletePost(id, userId) {
        return this.postsService.deletePost(id, userId);
    }
    async favoritePost(postId, userId) {
        return this.postsService.favoritePost(postId, userId);
    }
    async unfavoritePost(postId, userId) {
        return this.postsService.unfavoritePost(postId, userId);
    }
    async getComments(postId) {
        return this.postsService.getComments(postId);
    }
    async createComment(postId, userId, content) {
        return this.postsService.createComment(postId, userId, content);
    }
};
exports.PostsController = PostsController;
__decorate([
    (0, common_1.Get)("getAll"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "获取所有帖子" }),
    (0, swagger_1.ApiQuery)({ name: "isFavorited", required: false, description: "是否已收藏" }),
    (0, swagger_1.ApiQuery)({ name: "authorId", required: false, description: "作者ID" }),
    (0, swagger_1.ApiQuery)({ name: "published", required: false, description: "是否已发布" }),
    (0, swagger_1.ApiQuery)({
        name: "lastEditedAfter",
        required: false,
        description: "最后编辑时间戳",
    }),
    __param(0, (0, get_user_decorator_1.GetUser)("userId")),
    __param(1, (0, common_1.Query)("isFavorited")),
    __param(2, (0, common_1.Query)("authorId")),
    __param(3, (0, common_1.Query)("published")),
    __param(4, (0, common_1.Query)("lastEditedAfter")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getAllPosts", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "获取单篇文章" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "文章ID" }),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getPostById", null);
__decorate([
    (0, common_1.Post)("add"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "创建文章" }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: "object",
            properties: {
                title: { type: "string", description: "文章标题" },
                content: { type: "string", description: "文章内容" },
                published: { type: "boolean", description: "是否发布" },
            },
            required: ["title", "content"],
        },
    }),
    __param(0, (0, get_user_decorator_1.GetUser)("userId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "createPost", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "更新文章" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "文章ID" }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: "object",
            properties: {
                title: { type: "string", description: "文章标题" },
                content: { type: "string", description: "文章内容" },
                published: { type: "boolean", description: "是否发布" },
                previewText: { type: "string", description: "预览文本" },
            },
        },
    }),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)("userId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "updatePost", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "删除文章" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "文章ID" }),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "deletePost", null);
__decorate([
    (0, common_1.Post)(":postId/favorite"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "收藏文章" }),
    (0, swagger_1.ApiParam)({ name: "postId", description: "文章ID" }),
    __param(0, (0, common_1.Param)("postId", common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "favoritePost", null);
__decorate([
    (0, common_1.Delete)(":postId/favorite"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "取消收藏文章" }),
    (0, swagger_1.ApiParam)({ name: "postId", description: "文章ID" }),
    __param(0, (0, common_1.Param)("postId", common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "unfavoritePost", null);
__decorate([
    (0, common_1.Get)(":postId/comments"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "获取文章评论" }),
    (0, swagger_1.ApiParam)({ name: "postId", description: "文章ID" }),
    __param(0, (0, common_1.Param)("postId", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getComments", null);
__decorate([
    (0, common_1.Post)(":postId/comments"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "创建评论" }),
    (0, swagger_1.ApiParam)({ name: "postId", description: "文章ID" }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: "object",
            properties: {
                content: { type: "string", description: "评论内容" },
            },
            required: ["content"],
        },
    }),
    __param(0, (0, common_1.Param)("postId", common_1.ParseIntPipe)),
    __param(1, (0, get_user_decorator_1.GetUser)("userId")),
    __param(2, (0, common_1.Body)("content")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "createComment", null);
exports.PostsController = PostsController = __decorate([
    (0, swagger_1.ApiTags)("帖子"),
    (0, common_1.Controller)("posts"),
    __metadata("design:paramtypes", [posts_service_1.PostsService])
], PostsController);
//# sourceMappingURL=posts.controller.js.map