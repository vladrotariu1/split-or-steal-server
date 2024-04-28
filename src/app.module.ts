import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth/auth.controller';
import { AuthService } from './services/auth/auth.service';
import { UserProfileController } from './controllers/user-profile/user-profile.controller';
import { UserProfileService } from './services/user-profile/user-profile.service';
import { PaymentMethodsController } from './controllers/payment-methods/payment-methods.controller';
import FireBaseConfig from './config/firebase.config';
import { HttpModule } from '@nestjs/axios';
import { ChatRoomGateway } from './gateways/chat-room.gateway';
import { ChatService } from './services/chat/chat.service';
import {MockController} from './controllers/mock.controller';

@Module({
    imports: [HttpModule],
    controllers: [
        // AuthController,
        // UserProfileController,
        // PaymentMethodsController,
        MockController,
    ],
    providers: [
        // FireBaseConfig,
        // AuthService,
        // UserProfileService,
        // ChatRoomGateway,
        // ChatService,
    ],
})
export class AppModule {}
