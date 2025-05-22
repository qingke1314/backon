import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { UserModule } from "./user/user.module";
import { PrismaService } from "./prisma/prisma.service";
import { AuthModule } from "./auth/auth.module";
import { PostsModule } from "./posts/posts.module";

@Module({
  imports: [
    // 配置全局配置
    /**
     * 用于管理环境变量和配置
     * isGlobal: true 表示这个模块全局可用
     * 可以访问 .env 文件中的配置
     * 使用示例：this.configService.get('DATABASE_URL')
     */
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // 导入认证模块
    AuthModule,
    // 导入用户模块
    UserModule,
    // 导入文章模块
    PostsModule,
  ],
  // 给所有模块提供PrismaService
  providers: [PrismaService],
})
export class AppModule {}
