import {IsArray, IsNumber, IsObject} from 'class-validator';

export class UserToKickAdviceDto {
    @IsArray()
    goldenBallsAssignments: { playerId: string, shownGoldenBalls: number[] }[];

    @IsNumber()
    roomPot: number;
}
