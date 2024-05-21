import {Injectable} from '@nestjs/common';
import {arrayUnion, doc, DocumentReference, getDoc, getFirestore, updateDoc, setDoc} from 'firebase/firestore';
import {MessageDetailsDto} from '../../data/dto/message-details.dto';
import {Socket} from 'socket.io';
import {UserProfileService} from '../user-profile/user-profile.service';
import {ChatUserDetailsDto} from '../../data/dto/user-details.dto';
import {SplitOrStealChoices} from '../../data/enums/split-or-steal-choices';

@Injectable()
export class ChatService {
    private readonly socketToUserMap: Map<string, string> = new Map();
    private readonly chatRooms: Map<string, string[]> = new Map();
    private readonly socketToChatRoomMap: Map<string, string> = new Map();
    private readonly roomToTimeoutMap: Map<string, NodeJS.Timeout> = new Map();
    private readonly roomToConversationDocumentMap: Map<string, DocumentReference> = new Map();
    private readonly socketToChoiceMapping: Map<string, string> = new Map();

    constructor(private userProfileService: UserProfileService) {}

    async createConversationDocument(roomId: string) {
        const conversationDocRef = doc(
            getFirestore(),
            'conversations',
            crypto.randomUUID(),
        );

        const playerIds = this.chatRooms
            .get(roomId)
            .map(socketId => this.socketToUserMap.get(socketId));

        await setDoc(conversationDocRef, {
            player1Id: playerIds[0],
            player2Id: playerIds[1],
            messages: []
        });

        this.roomToConversationDocumentMap.set(roomId, conversationDocRef);
    }

    async writeMessage(roomId: string, messageDetails: MessageDetailsDto) {
        const messageDto = {
            id: crypto.randomUUID(),
            ...messageDetails,
        };

        const conversationDocRef = this.roomToConversationDocumentMap.get(roomId);

        await updateDoc(conversationDocRef, {
            messages: arrayUnion(messageDto),
        });

        return messageDto;
    }

    async writeChoiceToDocument(socketId: string, choice: SplitOrStealChoices) {
        const clientId = this.socketToUserMap.get(socketId);
        const roomId = this.socketToChatRoomMap.get(socketId);
        if (this.isRoomFull(roomId)) {
            const docRef = this.roomToConversationDocumentMap.get(roomId);
            const docSnap = await getDoc(docRef);
            const player1Id = docSnap.data().player1Id;
            const player2Id = docSnap.data().player2Id;

            let updateObj;

            if (clientId === player1Id) {
                updateObj = {
                    player1Choice: choice,
                }
            }

            if (clientId === player2Id) {
                updateObj = {
                    player2Choice: choice,
                }
            }

            await updateDoc(docRef, {
                ...updateObj
            });
        }
    }

    async getPlayersChoices(roomId: string) {
        const docRef = this.roomToConversationDocumentMap.get(roomId);
        const docSnap = await getDoc(docRef);

        const player1Id = docSnap.data().player1Id;
        const player2Id = docSnap.data().player2Id;

        const player1Choice = docSnap.data().player1Choice || SplitOrStealChoices.STEAL;
        const player2Choice = docSnap.data().player2Choice || SplitOrStealChoices.STEAL;

        return {
            player1: {
                id: player1Id,
                choice: player1Choice,
            },
            player2: {
                id: player2Id,
                choice: player2Choice,
            }
        }
    }

    removeRoomToConversationMapping(roomId: string) {
        this.roomToConversationDocumentMap.delete(roomId);
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

    createNewRoom() {
        const newRoomId = crypto.randomUUID();
        this.chatRooms.set(newRoomId, []);

        return newRoomId;
    }

    addUserToRoom(roomId: string, socketId: string) {
        const currentUsersInTheRoom = this.chatRooms.get(roomId);

        if (currentUsersInTheRoom.length >= 2) {
            throw new Error("Room is already full");
        }

        this.chatRooms.set(roomId, [...currentUsersInTheRoom, socketId]);
    }

    removeUserFromRoom(socketId: string) {
        const roomId = this.socketToChatRoomMap.get(socketId);
        const currentUsersInTheRoom = this.chatRooms.get(roomId);

        if (!currentUsersInTheRoom) {
            throw new Error(`Room wit id ${roomId} does not exist`);
        }

        if (!currentUsersInTheRoom.includes(socketId)) {
            throw new Error(`User ${socketId} could not be found in room with id ${roomId}`);
        }

        const removedUserArray = currentUsersInTheRoom.filter(id => id !== socketId);
        if (removedUserArray.length === 0) {
            this.chatRooms.delete(roomId);
            this.removeRoomToConversationMapping(roomId);
        } else {
            this.chatRooms.set(roomId, removedUserArray);
        }

        this.socketToChatRoomMap.delete(socketId);
    }

    findEmptyRoom() {
        for (const [roomId, socketsArray] of this.chatRooms) {
            if (socketsArray.length < 2) {
                return roomId;
            }
        }
        return null;
    }

    getUserRoom(socketId: string) {
        return this.socketToChatRoomMap.get(socketId);
    }

    getRoomUsers(roomId: string) {
        return this.chatRooms.get(roomId);
    }

    isRoomFull(roomId: string) {
        return this.chatRooms.get(roomId).length === 2;
    }

    joinNewUser(socket: Socket, userId: string) {
        let room = this.findEmptyRoom();
        if (room === null) {
            room = this.createNewRoom();
        }

        this.addSocketToUserMapping(socket.id, userId);
        this.addUserToRoom(room, socket.id);

        socket.join(room);
        this.socketToChatRoomMap.set(socket.id, room);

        console.log(this.chatRooms);
        console.log(this.socketToChatRoomMap);

        return room;
    }

    addTimeout(roomId: string, timeout: NodeJS.Timeout) {
        this.roomToTimeoutMap.set(roomId, timeout);
    }

    getTimeout(roomId: string) {
        return this.roomToTimeoutMap.get(roomId);
    }

    cancelTimeout(roomId: string) {
        const interval = this.roomToTimeoutMap.get(roomId);

        if (!interval) {
            throw new Error(`No interval set on room with id ${roomId}`);
        }

        clearTimeout(interval);
        this.roomToTimeoutMap.delete(roomId);
    }

    async getRoomUsersDetailsArray(roomId: string) {
        return Promise.all(
            this.chatRooms
                .get(roomId)
                .map(socketId => this.socketToUserMap.get(socketId))
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
        await this.writeChoiceToDocument(socketId, choice);
    }
}
