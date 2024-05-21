import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { AuthService } from '../services/auth/auth.service';
import { ChatService } from '../services/chat/chat.service';
import { UserProfileService } from '../services/user-profile/user-profile.service';
import { MessageDetailsDto } from '../data/dto/message-details.dto';
import {SplitOrStealChoices} from '../data/enums/split-or-steal-choices';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class ChatRoomGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    constructor(
        private authService: AuthService,
        private chatService: ChatService,
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
            console.log(decodedToken.uid);
            const roomId = this.chatService.joinNewUser(client, decodedToken.uid);

            if (this.chatService.isRoomFull(roomId)) {
                await this.startGame(roomId);
            }
        } catch (e) {
            console.log(e);
            client.disconnect(true);
            return;
        }
    }

    handleDisconnect(client: Socket) {
        const roomId = this.chatService.getUserRoom(client.id);
        const timeout = this.chatService.getTimeout(roomId);

        try {
            this.chatService.removeSocketToUserMapping(client.id);
            this.chatService.removeUserFromRoom(client.id);
            if (timeout) {
                // The interval still exists so this means the user disconnected too early
                // this.chatService.cancelTimeout(roomId);
                this.handleClientEarlyDisconnect(roomId);
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    async startGame(roomId: string) {
        const usersDetails = await this.chatService.getRoomUsersDetailsArray(roomId);

        await this.chatService.createConversationDocument(roomId);

        this.server.emit('start-game', usersDetails);

        const interval = setTimeout(() => {
            this.endGame(roomId);
        }, 2 * 60 * 1000);

        this.chatService.addTimeout(roomId, interval);
    }

    async endGame(roomId: string) {
        const roomUsers = this.chatService.getRoomUsers(roomId);
        const playerChoices = await this.chatService.getPlayersChoices(roomId);
        this.server.to(roomId).emit('end-game', playerChoices);

        try {
            this.chatService.cancelTimeout(roomId);
        } catch (e) {
            console.log(e);
        }

        roomUsers.forEach((socketId) => {
            const socket = this.server.sockets.sockets.get(socketId);
            if (socket) {
                socket.disconnect();
                console.log(`Disconnected socket: ${socketId} from room: ${roomId}`);
            }
        });
    }

    handleClientEarlyDisconnect(roomId: string) {
        this.endGame(roomId);
    }

    @SubscribeMessage('message')
    async handleMessage(client: Socket, payload: string) {
        console.log('Emitting new msg');
        const userId = this.chatService.getCorrespondingUserId(client.id);
        const userRecord = await this.userProfileService.findUserById(userId);
        const messageDetails: MessageDetailsDto = {
            userId: userId,
            userName: userRecord.email,
            userProfilePictureUrl: userRecord.photoURL || '',
            text: payload,
        };

        const roomId = this.chatService.getUserRoom(client.id);
        const message = await this.chatService.writeMessage(roomId, messageDetails);

        this.server.to(roomId).emit('message', message);
    }

    @SubscribeMessage('split-or-steal-decision')
    async handleSplitOrStealDecision(client: Socket, payload: SplitOrStealChoices) {
        await this.chatService.setPlayerChoice(client.id, payload);
    }
}
