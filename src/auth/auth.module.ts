import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

@Module({
  imports: [
    // 提供身份认证基础设施
    PassportModule,
    // 配置 JWT 模块
    JwtModule.register({
      // 使用环境变量中的 JWT 密钥
      secret: process.env.JWT_SECRET,
      // 设置 token 过期时间为 1 天
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [AuthController], // 添加控制器
  // 提供 JWT 策略和 Prisma 服务
  providers: [AuthService, JwtStrategy, PrismaService],
  exports: [JwtModule, AuthService], // 将配置好的 JwtModule 导出，供其他模块使用
})
export class AuthModule {}
