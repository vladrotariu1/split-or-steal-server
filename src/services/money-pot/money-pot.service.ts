import { Injectable } from '@nestjs/common';
import {GamePersistence} from '../../persistence/game.persistence';
import {GoldenBallsService} from '../golden-balls/golden-balls.service';
import {PlayersChoices} from '../../data/dto/players-choices.dto';
import {SplitOrStealChoices} from '../../data/enums/split-or-steal-choices';
import {GameConfing} from '../../config/game.config';
import {RealtimeDbService} from '../realtime-db/realtime-db.service';

@Injectable()
export class MoneyPotService {
    constructor(
        private gamePersistence: GamePersistence,
        private goldenBallsService: GoldenBallsService,
        private realtimeDbService: RealtimeDbService,
    ) {}

    addPlayerMoneyToRoomPot(roomId: string, balance: number) {
        const currentBalance = this.gamePersistence.getRoomToPotMapping(roomId);
        let newBalance = balance;

        if (currentBalance && currentBalance > 0) {
            newBalance += currentBalance;
        }

        this.gamePersistence.setRoomToPotMapping(roomId, newBalance);
    }

    addPlatformMoneyToRoomPot(roomId: string) {
        const currentPotBalance = this.gamePersistence.getRoomToPotMapping(roomId);
        const newBalance = currentPotBalance * 2;

        this.gamePersistence.setRoomToPotMapping(roomId, newBalance);

        return newBalance;
    }

    async computePlayersNewBalances(roomId: string, playersChoices: PlayersChoices) {
        const {player1, player2} = playersChoices;
        const roomPot = this.gamePersistence.getRoomToPotMapping(roomId);

        let player1ResultBalance = 0;
        let player2ResultBalance = 0;

        if (player1.choice === player2.choice && player1.choice === SplitOrStealChoices.STEAL) {
            player1ResultBalance = -1 * (GameConfing.GAME_TAX);
            player2ResultBalance = -1 * (GameConfing.GAME_TAX);
        }
        else if (player1.choice === player2.choice && player1.choice === SplitOrStealChoices.SPLIT) {
            player1ResultBalance = roomPot / 2;
            player2ResultBalance = roomPot / 2;
        }
        else if (player1.choice === SplitOrStealChoices.STEAL && player2.choice === SplitOrStealChoices.SPLIT) {
            player1ResultBalance = roomPot - GameConfing.GAME_TAX;
            player2ResultBalance = -1 * (GameConfing.GAME_TAX);
        }
        else if (player2.choice === SplitOrStealChoices.STEAL && player1.choice === SplitOrStealChoices.SPLIT) {
            player1ResultBalance = -1 * (GameConfing.GAME_TAX);
            player2ResultBalance = roomPot - GameConfing.GAME_TAX;
        }

        await this.realtimeDbService.updateUserBalance(player1.id, player1ResultBalance, true);
        await this.realtimeDbService.updateUserBalance(player2.id, player2ResultBalance, true);

        return {
            player1ResultBalance,
            player2ResultBalance
        }
    }

    recalculateRoomPotWithRemainedGoldenBalls(roomId: string) {
        const remainedGoldenBalls = this.goldenBallsService.getRemainedGoldenBalls(roomId);
        const killerBallsRemained = remainedGoldenBalls.filter(goldenBall => goldenBall.value === -1).length;
        const killerBallsRemovedBalance = killerBallsRemained === 0 ? 0 : Math.pow(2, killerBallsRemained);
        const goldenBallsBalance = remainedGoldenBalls.reduce(
            (sum, currentBall) => sum + (currentBall.value === -1 ? 0 : currentBall.value)
            , 0);
        const newRoomPot = goldenBallsBalance - killerBallsRemovedBalance

        this.gamePersistence.setRoomToPotMapping(roomId, newRoomPot);

        return {
            killerBallsRemained,
            killerBallsRemovedBalance,
            newRoomPot,
        }
    }
}
