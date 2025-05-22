import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";

/**
 * jwt策略是passport的jwt认证策略，用在jwtAuth守卫中
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) {
 *  return req.user;  // 这里的 user 就是 JwtStrategy 中 validate 方法返回的数据
 * }
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从请求头中提取JWT令牌
      ignoreExpiration: false, // 不忽略过期token
      secretOrKey: process.env.JWT_SECRET, // 使用JWT_SECRET作为密钥
    });
  }

  /**
   * 验证jwt令牌
   * @param payload jwtService.sign(payload)
   * @returns
   */
  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
    return { userId: user.id, email: user.email };
  }
}
