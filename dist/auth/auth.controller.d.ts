import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
    validateToken(req: any): Promise<{
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
