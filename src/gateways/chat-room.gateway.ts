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
import { MessageDetailsDto } from '../dto/messageDetails.dto';

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
        console.log('here');
        const token = client.handshake.headers.authorization;

        if (!token) {
            client.disconnect(true);
            return;
        }

        try {
            const decodedToken = await this.authService.verifyIdToken(token);
            this.chatService.addSocketToUserMapping(
                client.id,
                decodedToken.uid,
            );
        } catch (e) {
            client.disconnect(true);
            return;
        }
    }

    handleDisconnect(client: Socket) {
        this.chatService.removeSocketToUserMapping(client.id);
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

        this.server.emit('message', message);
    }
}
