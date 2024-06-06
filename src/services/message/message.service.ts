import { Injectable } from '@nestjs/common';
import {MessageDetailsDto} from '../../data/dto/message-details.dto';
import crypto from 'crypto';
import {arrayUnion, updateDoc} from 'firebase/firestore';
import {GamePersistence} from '../../persistence/game.persistence';

@Injectable()
export class MessageService {
    constructor(private gamePersistence: GamePersistence) {}

    async writeMessage(roomId: string, messageDetails: MessageDetailsDto) {
        const messageDto = {
            id: crypto.randomUUID(),
            ...messageDetails,
        };

        const conversationDocRef = this.gamePersistence.getRoomToDocumentMapping(roomId);

        await updateDoc(conversationDocRef, {
            messages: arrayUnion(messageDto),
        });

        return messageDto;
    }
}
