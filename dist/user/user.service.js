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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcrypt");
let UserService = class UserService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async create(createUserDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException("该邮箱已被注册");
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
    async login(loginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: loginDto.email },
        });
        if (!user) {
            throw new common_1.NotFoundException("用户未注册");
        }
        const isMatch = await bcrypt.compare(loginDto.password, user.password);
        if (!isMatch) {
            throw new common_1.UnauthorizedException("邮箱或密码不正确");
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
    async changePassword(userId, oldPassword, newPassword) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException("用户未找到");
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            throw new common_1.UnauthorizedException("旧密码不正确");
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
    async updateProfile(userId, updateData) {
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
    async uploadAvatar(userId, file) {
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
    async validateToken(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException("用户未找到");
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
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], UserService);
//# sourceMappingURL=user.service.js.map