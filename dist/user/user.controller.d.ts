import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
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
    changePassword(userId: number, body: {
        oldPassword: string;
        newPassword: string;
    }): Promise<{
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
