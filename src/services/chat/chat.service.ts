import { Injectable } from '@nestjs/common';
import {
    DocumentReference,
    arrayUnion,
    doc,
    getFirestore,
    updateDoc,
} from 'firebase/firestore';
import { MessageDetailsDto } from '../../dto/messageDetails.dto';

@Injectable()
export class ChatService {
    private readonly messageDocRef: DocumentReference;
    private readonly socketToUserMap: Map<string, string> = new Map();

    constructor() {
        this.messageDocRef = doc(
            getFirestore(),
            'conversations',
            'all-users-conversation',
        );
    }

    async writeMessage(messageDetails: MessageDetailsDto) {
        const messageDto = {
            id: crypto.randomUUID(),
            ...messageDetails,
        };

        await updateDoc(this.messageDocRef, {
            messages: arrayUnion(messageDto),
        });

        return messageDto;
    }

    addSocketToUserMapping(socketId: string, userId: string) {
        this.socketToUserMap.set(socketId, userId);
    }

    removeSocketToUserMapping(socketId) {
        this.socketToUserMap.delete(socketId);
    }

    getCorrespondingUserId(socketId: string) {
        return this.socketToUserMap.get(socketId);
    }
}
