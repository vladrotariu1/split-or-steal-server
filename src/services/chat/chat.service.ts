import {Injectable} from '@nestjs/common';
import {arrayUnion, doc, DocumentReference, getFirestore, updateDoc,} from 'firebase/firestore';
import {MessageDetailsDto} from '../../data/dto/message-details.dto';
import {Socket} from 'socket.io';
import {UserProfileService} from '../user-profile/user-profile.service';
import {ChatUserDetailsDto} from '../../data/dto/user-details.dto';

@Injectable()
export class ChatService {
    private readonly messageDocRef: DocumentReference;
    private readonly socketToUserMap: Map<string, string> = new Map();
    private readonly chatRooms: Map<string, string[]> = new Map();
    private readonly socketToChatRoomMap: Map<string, string> = new Map();

    constructor(private userProfileService: UserProfileService) {
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
}
