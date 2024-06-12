import {Injectable} from '@nestjs/common';
import {GameConfing} from '../config/game.config';
import {DocumentReference} from 'firebase/firestore';
import {GoldenBall} from '../data/models/golden-ball';

@Injectable()
export class GamePersistence {
    private readonly gameRoomToUsersSocketsMap: Map<string, string[]> = new Map();
    private readonly roomToDocumentMap: Map<string, DocumentReference> = new Map();
    private readonly roomToPotBallsMapping: Map<string, { playerId: string, balls: GoldenBall[] }[]> = new Map();
    private readonly roomToPotMapping: Map<string, number> = new Map();
    private readonly roomToRoundNumberMap: Map<string, number> = new Map();
    private readonly roomToTimeoutMap: Map<string, NodeJS.Timeout> = new Map();
    private readonly socketToGameRoomMap: Map<string, string> = new Map();
    private readonly socketToUserMap: Map<string, string> = new Map();

    constructor() {}

    getUserBySocketId(socketId: string) {
        return this.socketToUserMap.get(socketId);
    }

    getSocketByUserId(userId: string) {
        for (const [key, value] of this.socketToUserMap.entries()) {
            if (value === userId) {
                return key;
            }
        }

        return undefined;
    }

    removeSocketToUserMapping(socketId: string) {
        this.socketToUserMap.delete(socketId);
    }

    setSocketToUserMapping(socketId: string, userId: string) {
        this.socketToUserMap.set(socketId, userId);
    }

    getRoomToDocumentMapping(roomId: string) {
        return this.roomToDocumentMap.get(roomId);
    }

    removeRoomToDocumentMapping(roomId: string) {
        this.roomToDocumentMap.delete(roomId);
    }

    setRoomToDocumentMapping(roomId: string, document: DocumentReference) {
        this.roomToDocumentMap.set(roomId, document);
    }

    getRoomToPotBallsMapping(roomId: string) {
        return this.roomToPotBallsMapping.get(roomId);
    }

    setRoomToPotBallsMapping(roomId: string, potBalls: { playerId: string, balls: GoldenBall[] }[]) {
        this.roomToPotBallsMapping.set(roomId, potBalls);
    }

    getRoomToPotMapping(roomId: string) {
        return this.roomToPotMapping.get(roomId);
    }

    setRoomToPotMapping(roomId: string, pot: number) {
        this.roomToPotMapping.set(roomId, pot);
    }

    getRoomToRoundNumberMap(roomId: string) {
        return this.roomToRoundNumberMap.get(roomId);
    }

    setRoomToRoundNumberMap(roomId: string, roundNumber: number) {
        this.roomToRoundNumberMap.set(roomId, roundNumber);
    }

    cancelTimeout(roomId: string) {
        const interval = this.roomToTimeoutMap.get(roomId);

        if (!interval) {
            throw new Error(`No interval set on room with id ${roomId}`);
        }

        clearTimeout(interval);
        this.roomToTimeoutMap.delete(roomId);
    }

    getTimeoutByRoomId(roomId: string) {
        return this.roomToTimeoutMap.get(roomId);
    }

    removeRoomToTimeoutMapping(roomId: string) {
        this.roomToTimeoutMap.delete(roomId);
    }

    setRoomToTimeoutMapping(roomId: string, timeoutId: NodeJS.Timeout) {
        this.roomToTimeoutMap.set(roomId, timeoutId);
    }

    getRoomIdBySocketId(socketId: string) {
        return this.socketToGameRoomMap.get(socketId);
    }

    removeSocketToGameRoomMapping(socketId: string) {
        this.socketToGameRoomMap.delete(socketId);
    }

    setSocketToGameRoomMapping(socketId: string, gameRoomId: string) {
        this.socketToGameRoomMap.set(socketId, gameRoomId);
    }

    isRoomFull(roomId: string) {
        return this.gameRoomToUsersSocketsMap.get(roomId).length === GameConfing.ROOM_SIZE;
    }

    getGameRoomUsersSockets(roomId: string) {
        return this.gameRoomToUsersSocketsMap.get(roomId);
    }

    getEmptyRoom() {
        for (const [roomId, socketsArray] of this.gameRoomToUsersSocketsMap) {
            if (socketsArray.length < GameConfing.ROOM_SIZE) {
                return roomId;
            }
        }
        return null;
    }

    removeGameRoomToUsersSocketsMapping(roomId: string) {
        this.gameRoomToUsersSocketsMap.delete(roomId);
        console.log('removing users room', this.gameRoomToUsersSocketsMap);
    }

    setGameRoomToUsersSocketsMapping(roomId: string, usersSocketIds: string[]) {
        this.gameRoomToUsersSocketsMap.set(roomId, usersSocketIds);
        console.log('new user added in room', this.gameRoomToUsersSocketsMap);
    }
}
