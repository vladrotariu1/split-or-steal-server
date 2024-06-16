import {IsArray, IsNumber} from 'class-validator';

export class GoldenBallsDeclarationAdviceDto {
    @IsNumber()
    roomPot: number;

    @IsArray()
    displayedBallsValues: number[];

    @IsArray()
    hiddenBallsValues: number[];
}