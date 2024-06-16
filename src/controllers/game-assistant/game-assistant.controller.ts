import {Body, Controller, InternalServerErrorException, Post, Request, UseGuards, ValidationPipe} from '@nestjs/common';
import {OpenaiAssistantService} from '../../services/openai-assistant/openai-assistant.service';
import {GoldenBallsDeclarationAdviceDto} from '../../data/dto/golden-balls-declaration-advice.dto';
import {UserToKickAdviceDto} from '../../data/dto/user-to-kick-advice.dto';
import {VerifyAuthTokenGuard} from '../../guards/verify-auth-token.guard';

@UseGuards(VerifyAuthTokenGuard)
@Controller('game-assistant')
export class GameAssistantController {
    constructor(private openaiAssistantService: OpenaiAssistantService) {}

    @Post('golden-balls-declaration-advice')
    async goldenBallsDeclarationAdviceController(
        @Body(ValidationPipe) goldenBallsDeclarationAdviceDto: GoldenBallsDeclarationAdviceDto,
        @Request() req,
    ) {
        const { roomPot, displayedBallsValues, hiddenBallsValues } = goldenBallsDeclarationAdviceDto;
        const userId = req.userId;
        try {
            await this.openaiAssistantService.getAssistantBallDeclarationAdvice(roomPot, displayedBallsValues, hiddenBallsValues, userId);
        } catch (e) {
            throw new InternalServerErrorException('Internal server error');
        }
    }

    @Post('user-to-kick-advice')
    async userToKickAdviceController(
        @Body(ValidationPipe) userToKickAdviceDto: UserToKickAdviceDto,
        @Request() req,
    ) {
        const { goldenBallsAssignments, roomPot } = userToKickAdviceDto;
        const userId = req.userId;
        try {
            await this.openaiAssistantService.getAssistantUserToKickAdvice(goldenBallsAssignments, roomPot, userId);
        } catch (e) {
            throw new InternalServerErrorException('Internal server error');
        }
    }

    @Post('message-to-convince-opponent-to-split')
    async messageToConvinceOpponentToSplitController(@Request() req) {
        const userId = req.userId;
        try {
            await this.openaiAssistantService.getAssistantMessageToConvinceOpponentToSplit(userId);
        } catch (e) {
            throw new InternalServerErrorException('Internal server error');
        }
    }

}
