import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from "@nestjs/swagger";
import { PostsService } from "./posts.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { GetUser } from "../auth/get-user.decorator";

@ApiTags("帖子")
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get("getAll")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取所有帖子" })
  @ApiQuery({ name: "isFavorited", required: false, description: "是否已收藏" })
  @ApiQuery({ name: "authorId", required: false, description: "作者ID" })
  @ApiQuery({ name: "published", required: false, description: "是否已发布" })
  @ApiQuery({
    name: "lastEditedAfter",
    required: false,
    description: "最后编辑时间戳",
  })
  async getAllPosts(
    @GetUser("userId") userId: number,
    @Query("isFavorited") isFavorited?: string,
    @Query("authorId") authorId?: string,
    @Query("published") published?: string,
    @Query("lastEditedAfter") lastEditedAfter?: string
  ) {
    return this.postsService.getAllPosts(userId, {
      isFavorited,
      authorId,
      published,
      lastEditedAfter,
    });
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取单篇文章" })
  @ApiParam({ name: "id", description: "文章ID" })
  async getPostById(
    @Param("id", ParseIntPipe) id: number,
    @GetUser("userId") userId: number
  ) {
    return this.postsService.getPostById(id, userId);
  }

  @Post("add")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建文章" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "文章标题" },
        content: { type: "string", description: "文章内容" },
        published: { type: "boolean", description: "是否发布" },
      },
      required: ["title", "content"],
    },
  })
  async createPost(
    @GetUser("userId") userId: number,
    @Body() data: { title: string; content: string; published?: boolean }
  ) {
    return this.postsService.createPost(userId, data);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新文章" })
  @ApiParam({ name: "id", description: "文章ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "文章标题" },
        content: { type: "string", description: "文章内容" },
        published: { type: "boolean", description: "是否发布" },
        previewText: { type: "string", description: "预览文本" },
      },
    },
  })
  async updatePost(
    @Param("id", ParseIntPipe) id: number,
    @GetUser("userId") userId: number,
    @Body()
    data: {
      title?: string;
      content?: string;
      published?: boolean;
      previewText?: string;
    }
  ) {
    return this.postsService.updatePost(id, userId, data);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除文章" })
  @ApiParam({ name: "id", description: "文章ID" })
  async deletePost(
    @Param("id", ParseIntPipe) id: number,
    @GetUser("userId") userId: number
  ) {
    return this.postsService.deletePost(id, userId);
  }

  @Post(":postId/favorite")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "收藏文章" })
  @ApiParam({ name: "postId", description: "文章ID" })
  async favoritePost(
    @Param("postId", ParseIntPipe) postId: number,
    @GetUser("userId") userId: number
  ) {
    return this.postsService.favoritePost(postId, userId);
  }

  @Delete(":postId/favorite")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "取消收藏文章" })
  @ApiParam({ name: "postId", description: "文章ID" })
  async unfavoritePost(
    @Param("postId", ParseIntPipe) postId: number,
    @GetUser("userId") userId: number
  ) {
    return this.postsService.unfavoritePost(postId, userId);
  }

  @Get(":postId/comments")
  @ApiOperation({ summary: "获取文章评论" })
  @ApiParam({ name: "postId", description: "文章ID" })
  async getComments(@Param("postId", ParseIntPipe) postId: number) {
    return this.postsService.getComments(postId);
  }

  @Post(":postId/comments")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建评论" })
  @ApiParam({ name: "postId", description: "文章ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "评论内容" },
      },
      required: ["content"],
    },
  })
  async createComment(
    @Param("postId", ParseIntPipe) postId: number,
    @GetUser("userId") userId: number,
    @Body("content") content: string
  ) {
    return this.postsService.createComment(postId, userId, content);
  }
}
