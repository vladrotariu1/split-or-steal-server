import { Injectable } from '@nestjs/common';
import {getDoc, updateDoc} from 'firebase/firestore';
import {SplitOrStealChoices} from '../../data/enums/split-or-steal-choices';
import {PlayersChoices} from '../../data/dto/players-choices.dto';
import {GamePersistence} from '../../persistence/game.persistence';

@Injectable()
export class SplitOrStealService {
    constructor(private gamePersistence: GamePersistence) { }

    async getPlayersChoices(roomId: string) {
        const docRef = this.gamePersistence.getRoomToDocumentMapping(roomId);
        const docSnap = await getDoc(docRef);

        const player1Id = docSnap.data().player1Id;
        const player2Id = docSnap.data().player2Id;

        const player1Choice = docSnap.data().finalists.player1Choice || SplitOrStealChoices.STEAL;
        const player2Choice = docSnap.data().finalists.player2Choice || SplitOrStealChoices.STEAL;

        const playersChoices: PlayersChoices = {
            player1: {
                id: player1Id,
                choice: player1Choice,
            },
            player2: {
                id: player2Id,
                choice: player2Choice,
            }
        }

        return playersChoices;
    }

    async getFinalists(roomId: string) {
        const docRef = this.gamePersistence.getRoomToDocumentMapping(roomId);
        const docSnapshot = await getDoc(docRef);

        return {
            player1Id: docSnapshot.data().finalists.player1Id,
            player2Id: docSnapshot.data().finalists.player2Id,
        }
    }

    async setFinalists(roomId) {
        const docRef = this.gamePersistence.getRoomToDocumentMapping(roomId);
        const users = this.gamePersistence
            .getGameRoomUsersSockets(roomId)
            .map(socketId => this.gamePersistence.getUserBySocketId(socketId));

        await updateDoc(docRef, {
            finalists: {
                player1Id: users[0],
                player2Id: users[1]
            }
        });
    }

    async getFinalistsIds(roomId: string) {
        const docRef = this.gamePersistence.getRoomToDocumentMapping(roomId);
        const docSnap = await getDoc(docRef);
        const player1Id = docSnap.data().finalists.player1Id;
        const player2Id = docSnap.data().finalists.player2Id;

        return {
            player1Id,
            player2Id
        }
    }

    async writeChoiceToDocument(socketId: string, choice: SplitOrStealChoices) {
        const clientId = this.gamePersistence.getUserBySocketId(socketId);
        const roomId = this.gamePersistence.getRoomIdBySocketId(socketId);
        const docRef = this.gamePersistence.getRoomToDocumentMapping(roomId);
        const docSnap = await getDoc(docRef);
        const player1Id = docSnap.data().finalists.player1Id;
        const player2Id = docSnap.data().finalists.player2Id;

        let updateObj;

        if (clientId === player1Id) {
            updateObj = {
                ['finalists.player1Choice']: choice,
            }
        }

        if (clientId === player2Id) {
            updateObj = {
                ['finalists.player2Choice']: choice,
            }
        }

        await updateDoc(docRef, {
            ...updateObj
        });
    }
}
