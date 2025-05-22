import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createUserDto: CreateUserDto): Promise<{
        message: string;
        status: number;
        success: boolean;
        data: {
            id: number;
            email: string;
            name: string;
            createdAt: Date;
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
            id: number;
            email: string;
            name: string;
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
}
