import {
  Controller,
  Post,
  Body,
  UseGuards,
  Patch,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { GetUser } from "../auth/get-user.decorator";

@ApiTags("用户")
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: "用户注册" })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post("changePassword")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "修改密码" })
  async changePassword(
    @GetUser("userId") userId: number,
    @Body() body: { oldPassword: string; newPassword: string }
  ) {
    return this.userService.changePassword(
      userId,
      body.oldPassword,
      body.newPassword
    );
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新用户信息" })
  async updateProfile(
    @GetUser("userId") userId: number,
    @Body() updateData: any
  ) {
    return this.userService.updateProfile(userId, updateData);
  }

  @Post("upload-avatar")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiOperation({ summary: "上传头像" })
  async uploadAvatar(
    @GetUser("userId") userId: number,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.userService.uploadAvatar(userId, file);
  }
}
