import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { AuthService } from '../services/auth/auth.service';
import { GameService } from '../services/chat/game.service';
import { UserProfileService } from '../services/user-profile/user-profile.service';
import { SplitOrStealChoices } from '../data/enums/split-or-steal-choices';
import { GameConfing } from '../config/game.config';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class GameRoomGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    constructor(
        private authService: AuthService,
        private gameService: GameService,
        private userProfileService: UserProfileService,
    ) {}

    async handleConnection(client: Socket, ...args: any[]) {
        const token = client.handshake.headers.authorization;

        if (!token) {
            client.disconnect(true);
            return;
        }

        try {
            const decodedToken = await this.authService.verifyIdToken(token);
            const roomId = this.gameService.joinNewUser(client, decodedToken.uid);

            this.gameService.addPlayerGameTaxToRoomPot(roomId);

            if (this.gameService.isRoomFull(roomId)) {
                await this.startGame(roomId);
            }
        } catch (e) {
            console.log(e);
            client.disconnect(true);
            return;
        }
    }

    handleDisconnect(client: Socket) {
        this.gameService.handleDisconnect(client.id);
    }

    async startGame(roomId: string) {
        const {roomPot, usersDetails } = await this.gameService.prepareGameStart(roomId);

        this.server.emit('start-game', {
            roundDuration: GameConfing.ROUND_DURATION,
            roomPot,
            usersDetails,
        });

        await this.startGoldenBallsRound(roomId);
    }

    async startGoldenBallsRound(roomId: string) {
        const {
            ballsAssignments,
            roomSockets,
            shownBallsAssignments
        } = this.gameService.prepareGoldenBallsRoundStart(roomId);

        for (const socketId of roomSockets) {
            const userGoldenBallsAssignment = ballsAssignments.find(({ playerId }) => playerId === socketId);
            this.server.to(socketId).emit('start-golden-ball-round', {
                userGoldenBallsAssignment: userGoldenBallsAssignment.balls,
                shownBallsAssignments
            });
        }

        const timeout = setTimeout(async () => {
            await this.endGoldenBallsRound(roomId);
            clearTimeout(timeout);
        }, GameConfing.ROUND_DURATION);

        this.gameService.incrementRoundNumber(roomId);
    }

    async endGoldenBallsRound(roomId: string) {
        const { kickedUserAppId, kickedUserSocketId } = await this.gameService.handleGoldenBallsRoundEnd(roomId);
        const socket = this.server.sockets.sockets.get(kickedUserSocketId);

        this.server.to(roomId).emit('kicked', kickedUserAppId);

        socket.disconnect();

        if (this.gameService.shouldStartSplitOrSteal(roomId)) {
            await this.prepareSplitOrSteal(roomId);
            return;
        }

        await this.startGoldenBallsRound(roomId);
    }

    async prepareSplitOrSteal(roomId: string) {
        const {
            finalists,
            recalculatedRoomPotObject
        } = await this.gameService.prepareSplitOrSteal(roomId);

        this.server.emit('prepare-split-or-steal', {
            finalists,
            recalculatedRoomPotObject
        });

        const timeout = setTimeout(() => {
            this.startSplitOrSteal(roomId);
            clearTimeout(timeout);
        }, GameConfing.PREPARE_SPLIT_OR_STEAL_DURATION);
    }

    async startSplitOrSteal(roomId: string) {
        this.server.emit('start-split-or-steal', {
            roundDuration: GameConfing.ROUND_DURATION,
            startTime: Date.now()
        });

        const timeout = setTimeout(() => {
            this.endSplitOrSteal(roomId);
            clearTimeout(timeout);
        }, GameConfing.ROUND_DURATION)
    }

    async endSplitOrSteal(roomId: string) {
        const {
            player1,
            player2,
            roomUsers
        } = await this.gameService.handleSplitOrStealEnd(roomId);

        this.server.to(roomId).emit('end-game', {
            player1,
            player2
        });

        roomUsers.forEach((socketId) => {
            const socket = this.server.sockets.sockets.get(socketId);
            if (socket) {
                socket.disconnect();
                console.log(`Disconnected socket: ${socketId} from room: ${roomId}`);
            }
        });
    }

    handleClientEarlyDisconnect(roomId: string) {

    }

    @SubscribeMessage('message')
    async handleMessage(client: Socket, payload: string) {
        const message = await this.gameService.createMessage(client.id, payload);
        const roomId = this.gameService.getUserRoom(client.id);

        this.server.to(roomId).emit('message', message);
    }

    @SubscribeMessage('split-or-steal-decision')
    async handleSplitOrStealDecision(client: Socket, payload: SplitOrStealChoices) {
        await this.gameService.setPlayerChoice(client.id, payload);
    }

    @SubscribeMessage('golden-balls-kick-decision')
    async handleGoldenBallsKickDecision(client: Socket, payload: string) {
        await this.gameService.setGoldenBallsKickDecision(client.id, payload);
    }
}
