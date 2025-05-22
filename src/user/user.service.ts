import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { CreateUserDto } from "./dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException("该邮箱已被注册");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const newUser = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return {
      message: "注册成功",
      status: 201,
      success: true,
      data: newUser,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new NotFoundException("用户未注册");
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException("邮箱或密码不正确");
    }

    const payload = { userId: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
      },
    };
  }

  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("用户未找到");
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException("旧密码不正确");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return {
      message: "密码修改成功",
      success: true,
    };
  }

  async updateProfile(userId: number, updateData: any) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: "用户信息更新成功",
      success: true,
      data: updatedUser,
    };
  }

  async uploadAvatar(userId: number, file: Express.Multer.File) {
    const fileUrl = `http://118.178.197.208:9981/public/uploads/avatars/${file.filename}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: fileUrl },
    });

    return {
      success: true,
      data: { url: fileUrl },
      message: "头像上传成功",
    };
  }

  async validateToken(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("用户未找到");
    }

    const payload = { userId: user.id, email: user.email };
    const newToken = this.jwtService.sign(payload);

    return {
      success: true,
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
      },
    };
  }
}
