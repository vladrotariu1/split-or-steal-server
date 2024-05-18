import {
    Controller,
    Put,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    Request,
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
}
