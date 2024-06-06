import { Injectable } from '@nestjs/common';
import {GamePersistence} from '../../persistence/game.persistence';
import {getDoc, updateDoc} from 'firebase/firestore';
import {GoldenBall} from '../../data/models/golden-ball';
import {GameConfing} from '../../config/game.config';

@Injectable()
export class GoldenBallsService {
    constructor(private gamePersistence: GamePersistence) { }

    async setGoldenBallsKickDecision(socketId: string, kickedUserId: string) {
        const userId = this.gamePersistence.getUserBySocketId(socketId);
        const roomId = this.gamePersistence.getRoomIdBySocketId(socketId);
        const docRef = this.gamePersistence.getRoomToDocumentMapping(roomId);
        const roundNumber = this.gamePersistence.getRoomToRoundNumberMap(roomId);

        await updateDoc(docRef, {
            [`kickVotes.round-${roundNumber}.${userId}`]: kickedUserId
        });
    }

    generateRoomPotBalls(roomId: string): GoldenBall[] {
        const roomPot = this.gamePersistence.getRoomToPotMapping(roomId);
        const numberOfPlayersInRoom = this.gamePersistence.getGameRoomUsersSockets(roomId).length;

        const bigBallsPot = GameConfing.BIG_BALLS_WEIGHT * roomPot;
        const mediumBallsPot = GameConfing.MEDIUM_BALLS_WEIGHT * roomPot;
        const smallBallsPot = GameConfing.SMALL_BALLS_WEIGHT * roomPot;

        const numberOfBigBalls = GameConfing.NUMBER_OF_BIG_BALLS_PER_PLAYER * numberOfPlayersInRoom;
        const numberOfMediumBalls = GameConfing.NUMBER_OF_MEDIUM_BALLS_PER_PLAYER * numberOfPlayersInRoom;
        const numberOfSmallBalls = GameConfing.NUMBER_OF_SMALL_BALLS_PER_PLAYER * numberOfPlayersInRoom;

        const bigBallValue = bigBallsPot / numberOfBigBalls;
        const mediumBallValue = mediumBallsPot / numberOfMediumBalls;
        const smallBallValue = smallBallsPot / numberOfSmallBalls;

        return [
            ...Array<number>(numberOfBigBalls).fill(bigBallValue),
            ...Array<number>(numberOfMediumBalls).fill(mediumBallValue),
            ...Array<number>(numberOfSmallBalls).fill(smallBallValue),
            ...Array<number>(numberOfPlayersInRoom * GameConfing.NUMBER_OF_KILLER_BALLS_PER_PLAYER).fill(-1)
        ]
            .map(value => ({
                id: crypto.randomUUID(),
                value,
            }));
    }

    createGoldenBallsAssignment(goldenBalls: GoldenBall[], playerIds: string[]) {
        const shuffledGoldenBalls = goldenBalls
            .sort(() => Math.random() - 0.5)
            .sort(() => Math.random() - 0.5)
            .sort(() => Math.random() - 0.5);

        return playerIds.map((playerId, idx) => ({
            balls: shuffledGoldenBalls.slice(
                GameConfing.NUMBER_OF_BALLS_PER_PLAYER * idx,
                GameConfing.NUMBER_OF_BALLS_PER_PLAYER * idx + GameConfing.NUMBER_OF_BALLS_PER_PLAYER
            ),
            playerId,
        }));
    }

    assignInitialBalls(roomId: string) {
        const playersSocketsIds = this.gamePersistence.getGameRoomUsersSockets(roomId);
        const generatedGoldenBalls = this.generateRoomPotBalls(roomId);

        const ballsAssignment = this.createGoldenBallsAssignment(generatedGoldenBalls, playersSocketsIds);

        this.gamePersistence.setRoomToPotBallsMapping(roomId, ballsAssignment);
    }

    chooseBallsToShow(roomId: string) {
        const goldenBallsAssignments = this.gamePersistence.getRoomToPotBallsMapping(roomId);
        return goldenBallsAssignments.map(({ playerId: socketId, balls }) => ({
            playerId: this.gamePersistence.getUserBySocketId(socketId),
            shownBalls: [balls[0], balls[1]]
        }));
    }

    getRemainedGoldenBalls(roomId: string) {
        const goldenBalls = this.gamePersistence.getRoomToPotBallsMapping(roomId);

        return goldenBalls.reduce(
            (accumulator, currentValue) => [...accumulator, ...currentValue.balls],
            [] as GoldenBall[]
        );
    }

    chooseBallsToShowForUserSum(userId: string) {
        const socketId = this.gamePersistence.getSocketByUserId(userId);
        const roomId = this.gamePersistence.getRoomIdBySocketId(socketId);
        const chosenBalls = this.chooseBallsToShow(roomId);
        return chosenBalls
            .find(({ playerId }) => playerId === userId)
            .shownBalls
            .reduce((accumulator, currentBall) => accumulator + currentBall.value, 0);
    }

    reshuffleRoomBalls(roomId: string) {
        const roomSocketIds = this.gamePersistence.getGameRoomUsersSockets(roomId);
        const goldenBallsArray = this.getRemainedGoldenBalls(roomId);
        const ballsAssignment = this.createGoldenBallsAssignment(goldenBallsArray, roomSocketIds);

        this.gamePersistence.setRoomToPotBallsMapping(roomId, ballsAssignment);

        return ballsAssignment;
    }

    removeUserBalls(socketId: string) {
        const roomId = this.gamePersistence.getRoomIdBySocketId(socketId);
        const currentRoomBalls = this.gamePersistence.getRoomToPotBallsMapping(roomId);
        const newRoomBalls = currentRoomBalls.filter(userBalls => userBalls.playerId !== socketId);

        this.gamePersistence.setRoomToPotBallsMapping(roomId, newRoomBalls);
    }

    computeKickedUser(kickVotes: string[]) {
        // Step 1: Count the votes
        const voteCount: Map<string, number> = new Map();

        kickVotes.forEach((userId) => {
            if (voteCount.has(userId)) {
                voteCount.set(userId, voteCount.get(userId)! + 1);
            } else {
                voteCount.set(userId, 1);
            }
        });

        // Step 2: Find the maximum number of votes
        let maxVotes = 0;
        voteCount.forEach((count) => {
            if (count > maxVotes) {
                maxVotes = count;
            }
        });

        // Step 3: Get all user IDs with the maximum number of votes
        const candidates: string[] = [];
        voteCount.forEach((count, userId) => {
            if (count === maxVotes) {
                candidates.push(userId);
            }
        });

        // Step 4: Return the lexicographically smallest user ID
        candidates.sort((el, nextEl) => this.chooseBallsToShowForUserSum(el) - this.chooseBallsToShowForUserSum(nextEl));
        return candidates[0];
    }

    async getKickedUser(roomId) {
        const docRef = this.gamePersistence.getRoomToDocumentMapping(roomId);
        const roundNumber = this.gamePersistence.getRoomToRoundNumberMap(roomId);

        const docSnap = await getDoc(docRef);

        let kickVotes: string[];

        if (!docSnap.data().kickVotes || !docSnap.data().kickVotes[`round-${roundNumber}`]) {
            kickVotes = [...(
                this.gamePersistence
                    .getGameRoomUsersSockets(roomId)
                    .map(socketId => this.gamePersistence.getUserBySocketId(socketId))
            )];
        }
        else {
            const kickVotesObject = docSnap.data().kickVotes[`round-${roundNumber}`];
            kickVotes = Object.values(kickVotesObject);
        }

        const kickedUserId = this.computeKickedUser(kickVotes);

        return this.gamePersistence.getSocketByUserId(kickedUserId);
    }
}
