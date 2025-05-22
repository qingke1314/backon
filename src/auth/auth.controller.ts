import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { LoginDto } from "./dto/login.dto";

@ApiTags("认证")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: "用户登录" })
  @Post("login")
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password
    );
    if (!user) {
      throw new UnauthorizedException("邮箱或密码错误");
    }
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: "验证并刷新 token" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("validate")
  async validateToken(@Request() req) {
    return this.authService.validateToken(req.user.userId);
  }
}
