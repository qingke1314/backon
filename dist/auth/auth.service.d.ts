import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<{
        id: number;
        email: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
        avatar: string | null;
        phoneNumber: string | null;
    }>;
    login(loginDto: LoginDto): Promise<{
        message: string;
        success: boolean;
        data: {
            token: string;
            user: {
                id: number;
                email: string;
                name: string;
                avatar: string;
            };
        };
    }>;
    validateToken(userId: number): Promise<{
        message: string;
        success: boolean;
        data: {
            token: string;
            user: {
                id: number;
                email: string;
                name: string;
                avatar: string;
            };
        };
    }>;
}
