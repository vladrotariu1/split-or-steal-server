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
            const roomId = this.chatService.joinNewUser(client, decodedToken.uid);

            if (this.chatService.isRoomFull(roomId)) {
                const usersDetails = await this.chatService.getRoomUsersDetailsArray(roomId);
                this.server.emit('start-game', usersDetails);
                setTimeout(() => {
                    this.endGame(roomId);
                }, 1000);
            }
        } catch (e) {
            console.log(e);
            client.disconnect(true);
            return;
        }
    }

    handleDisconnect(client: Socket) {
        try {
            this.chatService.removeSocketToUserMapping(client.id);
            this.chatService.removeUserFromRoom(client.id);
        }
        catch (e) {
            console.log(e);
        }
    }

    endGame(roomId: string) {
        const roomUsers = this.chatService.getRoomUsers(roomId);
        this.server.to(roomId).emit('end-game');

        roomUsers.forEach((socketId) => {
            const socket = this.server.sockets.sockets.get(socketId);
            if (socket) {
                socket.disconnect();
                console.log(`Disconnected socket: ${socketId} from room: ${roomId}`);
            }
        });
    }

    @SubscribeMessage('message')
    async handleMessage(client: Socket, payload: string) {
        const userId = this.chatService.getCorrespondingUserId(client.id);
        const userRecord = await this.userProfileService.findUserById(userId);
        const messageDetails: MessageDetailsDto = {
            userId: userId,
            userName: userRecord.email,
            userProfilePictureUrl: userRecord.photoURL || '',
            text: payload,
        };

        const message = await this.chatService.writeMessage(messageDetails);
        const roomId = this.chatService.getUserRoom(client.id);

        this.server.to(roomId).emit('message', message);
    }
}
