import {
    Controller,
    Put,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    Request, Get, Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserProfileService } from '../../services/user-profile/user-profile.service';
import { FileExtensionValidationPipe } from '../../pipes/file-extension-validation.pipe';
import { FileDto } from '../../data/dto/file.dto';
import { VerifyAuthTokenGuard } from '../../guards/verify-auth-token.guard';

@Controller('user-profile')
export class UserProfileController {
    constructor(private userProfileService: UserProfileService) {}

    @Put('profile-picture')
    @UseGuards(VerifyAuthTokenGuard)
    @UseInterceptors(FileInterceptor('file'))
    async uploadProfilePicture(
        @UploadedFile(FileExtensionValidationPipe)
        file: FileDto,
        @Request() req,
    ) {
        const userId = req.userId;
        return this.userProfileService.uploadProfilePicture(file, userId);
    }

    @Get('statistics/:id')
    @UseGuards(VerifyAuthTokenGuard)
    async getUserStatistics(@Param('id') userId: string) {
        return this.userProfileService.getUserStatistics(userId);
    }

    @Get('game-history')
    @UseGuards(VerifyAuthTokenGuard)
    async getUserGameHistory(@Request() req) {
        const userId = req.userId;
        return this.userProfileService.getUserGameHistory(userId);
    }

    @Get('game-history/:id')
    @UseGuards(VerifyAuthTokenGuard)
    async getGameMessages(@Param('id') gameId: string) {
        return this.userProfileService.getGameMessages(gameId);
    }
}
