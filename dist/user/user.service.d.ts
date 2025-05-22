import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
export declare class UserService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    create(createUserDto: CreateUserDto): Promise<{
        message: string;
        status: number;
        success: boolean;
        data: {
            email: string;
            name: string;
            id: number;
            createdAt: Date;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        success: boolean;
        token: string;
        user: {
            id: number;
            email: string;
            name: string;
            avatar: string;
            phoneNumber: string;
        };
    }>;
    changePassword(userId: number, oldPassword: string, newPassword: string): Promise<{
        message: string;
        success: boolean;
    }>;
    updateProfile(userId: number, updateData: any): Promise<{
        message: string;
        success: boolean;
        data: {
            email: string;
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            avatar: string;
            phoneNumber: string;
        };
    }>;
    uploadAvatar(userId: number, file: Express.Multer.File): Promise<{
        success: boolean;
        data: {
            url: string;
        };
        message: string;
    }>;
    validateToken(userId: number): Promise<{
        success: boolean;
        token: string;
        user: {
            id: number;
            email: string;
            name: string;
            avatar: string;
            phoneNumber: string;
        };
    }>;
}
