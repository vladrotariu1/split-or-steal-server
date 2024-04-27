import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserDto } from '../../dto/create-user.dto';
import { LoginUserDto } from '../../dto/login-user.dto';
import { UserDetailsDto } from '../../dto/user-details.dto';
import { AuthService } from '../../services/auth/auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('create-user')
    async createUser(
        @Body() createUserDto: CreateUserDto,
    ): Promise<UserDetailsDto> {
        return this.authService.createUser(createUserDto);
    }

    @Post('login')
    async loginUser(
        @Body() loginUserDto: LoginUserDto,
    ): Promise<UserDetailsDto> {
        return this.authService.loginUser(loginUserDto);
    }
}
