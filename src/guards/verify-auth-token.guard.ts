import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../services/auth/auth.service';

@Injectable()
export class VerifyAuthTokenGuard implements CanActivate {
    constructor(private authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        const token: string = request.headers.authorization?.split(' ')[1];

        if (!token) {
            return false;
        }

        try {
            const decodedToken = await this.authService.verifyIdToken(token);
            request.userId = decodedToken.uid;

            return true;
        } catch (error) {
            console.error('Error verifying Firebase token:', error);
            return false;
        }
    }
}
