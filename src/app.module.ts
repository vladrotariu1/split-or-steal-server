import { Module} from '@nestjs/common';
import { AuthController } from './controllers/auth/auth.controller';
import { AuthService } from './services/auth/auth.service';
import { UserProfileController } from './controllers/user-profile/user-profile.controller';
import { UserProfileService } from './services/user-profile/user-profile.service';
import { PaymentsController } from './controllers/payments/payments.controller';
import FireBaseConfig from './config/firebase.config';
import { HttpModule } from '@nestjs/axios';
import { ChatRoomGateway } from './gateways/chat-room.gateway';
import { ChatService } from './services/chat/chat.service';
import { RealtimeDbService } from './services/realtime-db/realtime-db.service';
import { StripeWebhookController } from './controllers/stripe-webhook/stripe-webhook.controller';
import StripeConfig from './config/stripe.config';

@Module({
    imports: [HttpModule],
    controllers: [
        AuthController,
        UserProfileController,
        PaymentsController,
        StripeWebhookController,
    ],
    providers: [
        FireBaseConfig,
        StripeConfig,
        AuthService,
        UserProfileService,
        ChatRoomGateway,
        ChatService,
        RealtimeDbService,
    ],
})
export class AppModule {}
