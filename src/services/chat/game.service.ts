import {Injectable} from '@nestjs/common';
import {doc, getFirestore, setDoc} from 'firebase/firestore';
import {Socket} from 'socket.io';
import {UserProfileService} from '../user-profile/user-profile.service';
import {ChatUserDetailsDto} from '../../data/dto/user-details.dto';
import {SplitOrStealChoices} from '../../data/enums/split-or-steal-choices';
import {GameConfing} from '../../config/game.config';
import {RealtimeDbService} from '../realtime-db/realtime-db.service';
import * as crypto from 'crypto';
import {GamePersistence} from '../../persistence/game.persistence';
import {GoldenBallsService} from '../golden-balls/golden-balls.service';
import {SplitOrStealService} from '../split-or-steal/split-or-steal.service';
import {MoneyPotService} from '../money-pot/money-pot.service';
import {MessageDetailsDto} from '../../data/dto/message-details.dto';
import {MessageService} from '../message/message.service';

@Injectable()
export class GameService {
    constructor(
        private gamePersistence: GamePersistence,
        private goldenBallsService: GoldenBallsService,
        private messageService: MessageService,
        private moneyPotService: MoneyPotService,
        private splitOrStealService: SplitOrStealService,
        private realtimeDbService: RealtimeDbService,
        private userProfileService: UserProfileService,
    ) {}

    addPlayerGameTaxToRoomPot(roomId: string, ) {
        this.moneyPotService.addPlayerMoneyToRoomPot(roomId, GameConfing.GAME_TAX);
    }

    addUserToRoom(roomId: string, socketId: string) {
        const currentUserSocketsInTheRoom = this.gamePersistence.getGameRoomUsersSockets(roomId);

        if (currentUserSocketsInTheRoom.length >= GameConfing.ROOM_SIZE) {
            throw new Error("Room is already full");
        }

        this.gamePersistence.setGameRoomToUsersSocketsMapping(roomId, [...currentUserSocketsInTheRoom, socketId]);
    }

    async createConversationDocument(roomId: string) {
        const conversationDocRef = doc(
            getFirestore(),
            'conversations',
            crypto.randomUUID(),
        );

        const playerIds = this.gamePersistence
            .getGameRoomUsersSockets(roomId)
            .map(socketId => this.gamePersistence.getUserBySocketId(socketId));

        await setDoc(conversationDocRef, {
            creationDate: Date.now(),
            playerIds,
            messages: []
        });

        this.gamePersistence.setRoomToDocumentMapping(roomId, conversationDocRef);
    }

    async createMessage(socketId: string, messageText: string) {
        const userId = this.gamePersistence.getUserBySocketId(socketId);
        const userRecord = await this.userProfileService.findUserById(userId);
        const messageDetails: MessageDetailsDto = {
            userId: userId,
            userName: userRecord.email,
            userProfilePictureUrl: userRecord.photoURL || '',
            text: messageText,
        };

        const roomId = this.getUserRoom(socketId);
        return await this.messageService.writeMessage(roomId, messageDetails);
    }

    createNewRoom() {
        const newRoomId = crypto.randomUUID();
        this.gamePersistence.setGameRoomToUsersSocketsMapping(newRoomId, []);

        return newRoomId;
    }

    isRoomFull(roomId: string) {
        return this.gamePersistence.isRoomFull(roomId);
    }

    handleDisconnect(socketId: string) {
        const roomId = this.getUserRoom(socketId);
        const timeout = this.gamePersistence.getTimeoutByRoomId(roomId);

        try {
            this.gamePersistence.removeSocketToUserMapping(socketId);
            this.removeUserSocketIdFromRoom(socketId);
            if (timeout) {
                // The interval still exists so this means the user disconnected too early
                // this.chatService.cancelTimeout(roomId);
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    async handleGoldenBallsRoundEnd(roomId: string) {
        const kickedUserSocketId = await this.goldenBallsService.getKickedUser(roomId);
        const kickedUserAppId = this.gamePersistence.getUserBySocketId(kickedUserSocketId);
        const ballsAssignments = this.gamePersistence
            .getRoomToPotBallsMapping(roomId)
            .map(ballsAssignment => ({
                ...ballsAssignment,
                playerId: this.gamePersistence.getUserBySocketId(ballsAssignment.playerId)
            }));

        this.goldenBallsService.removeUserBalls(kickedUserSocketId);
        const {
            killerBallsRemained,
            newRoomPot
        } = this.moneyPotService.recalculateRoomPotWithRemainedGoldenBalls(roomId);

        await this.subtractFromUserBalance(kickedUserAppId, GameConfing.GAME_TAX);

        return {
            ballsAssignments,
            kickedUserAppId,
            kickedUserSocketId,
            killerBallsRemained,
            newRoomPot
        };
    }

    async handleSplitOrStealEnd(roomId: string) {
        const roomUsers = this.gamePersistence.getGameRoomUsersSockets(roomId);
        const playerChoices = await this.splitOrStealService.getPlayersChoices(roomId);
        const {
            player1ResultBalance,
            player2ResultBalance
        } = await this.moneyPotService.computePlayersNewBalances(roomId, playerChoices);

        return {
            player1: { ...playerChoices.player1, resultBalance: player1ResultBalance },
            player2: { ...playerChoices.player2, resultBalance: player2ResultBalance },
            roomUsers,
        }
    }

    async prepareGameStart(roomId: string) {
        const usersDetails = await this.getRoomUsersDetailsArray(roomId);
        const roomPot = this.moneyPotService.addPlatformMoneyToRoomPot(roomId);

        await this.createConversationDocument(roomId);
        const {numberOfKillerBalls} = this.goldenBallsService.assignInitialBalls(roomId);

        return { numberOfKillerBalls, usersDetails, roomPot };
    }

    prepareGoldenBallsRoundStart(roomId: string) {
        const ballsAssignments = this.goldenBallsService.reshuffleRoomBalls(roomId);
        const shownBallsAssignments = this.goldenBallsService.chooseBallsToShow(roomId);
        const roomSockets = this.gamePersistence.getGameRoomUsersSockets(roomId);

        return {
            ballsAssignments,
            shownBallsAssignments,
            roomSockets,
        }
    }

    async prepareSplitOrSteal(roomId: string) {
        await this.splitOrStealService.setFinalists(roomId);
        const finalists = await this.splitOrStealService.getFinalists(roomId);
        const recalculatedRoomPotObject = this.moneyPotService.recalculateRoomPotWithRemainedGoldenBalls(roomId);

        return {
            finalists,
            recalculatedRoomPotObject
        }
    }

    removeUserSocketIdFromRoom(socketId: string) {
        const roomId = this.getUserRoom(socketId);
        const currentUserSocketsInTheRoom = this.gamePersistence.getGameRoomUsersSockets(roomId);

        if (!currentUserSocketsInTheRoom) {
            throw new Error(`Room wit id ${roomId} does not exist`);
        }

        if (!currentUserSocketsInTheRoom.includes(socketId)) {
            throw new Error(`User ${socketId} could not be found in room with id ${roomId}`);
        }

        const removedUseSocketsArray = currentUserSocketsInTheRoom.filter(id => id !== socketId);
        if (removedUseSocketsArray.length === 0) {
            this.gamePersistence.removeGameRoomToUsersSocketsMapping(roomId);
            this.gamePersistence.removeRoomToDocumentMapping(roomId);
        } else {
            this.gamePersistence.setGameRoomToUsersSocketsMapping(roomId, removedUseSocketsArray);
        }

        this.gamePersistence.removeSocketToGameRoomMapping(socketId);
    }

    getUserIdBySocketId(socketId: string) {
        return this.gamePersistence.getUserBySocketId(socketId);
    }

    getUserRoom(socketId: string) {
        return this.gamePersistence.getRoomIdBySocketId(socketId);
    }

    shouldStartSplitOrSteal(roomId: string) {
        return this.gamePersistence.getGameRoomUsersSockets(roomId).length === 2;
    }

    joinNewUser(socket: Socket, userId: string) {
        let roomId = this.gamePersistence.getEmptyRoom();
        if (roomId === null) {
            roomId = this.createNewRoom();
        }

        this.gamePersistence.setSocketToUserMapping(socket.id, userId);
        this.addUserToRoom(roomId, socket.id);

        socket.join(roomId);
        this.gamePersistence.setSocketToGameRoomMapping(socket.id, roomId);

        return roomId;
    }

    async getRoomUsersDetailsArray(roomId: string) {
        return Promise.all(
            this.gamePersistence
                .getGameRoomUsersSockets(roomId)
                .map(socketId => this.gamePersistence.getUserBySocketId(socketId))
                .map(async (userId) => {
                    const userRecord = await this.userProfileService.findUserById(userId);
                    const userDetailsInChat: ChatUserDetailsDto = {
                        userId: userRecord.uid,
                        userName: userRecord.email,
                        userPhotoUrl: userRecord.photoURL
                    };

                    return userDetailsInChat;
                }
            )
        );
    }

    async setPlayerChoice(socketId: string, choice: SplitOrStealChoices) {
        await this.splitOrStealService.writeChoiceToDocument(socketId, choice);
    }

    async subtractFromUserBalance(playerId: string, subtractedBalance: number) {
        await this.realtimeDbService.updateUserBalance(playerId, -1 * subtractedBalance, true);
    }

    async setGoldenBallsKickDecision(socketId: string, payload: string) {
        try {
            await this.goldenBallsService.setGoldenBallsKickDecision(socketId, payload);
        } catch (e) {
            console.log(e);
        }
    }

    incrementRoundNumber(roomId: string) {
        const roundNumber= this.gamePersistence.getRoomToRoundNumberMap(roomId);
        const newRoundNumber = roundNumber === undefined ? 0 : roundNumber + 1;

        this.gamePersistence.setRoomToRoundNumberMap(roomId, newRoundNumber);
    }
}
