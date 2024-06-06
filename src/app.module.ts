import { Module} from '@nestjs/common';
import { AuthController } from './controllers/auth/auth.controller';
import { AuthService } from './services/auth/auth.service';
import { UserProfileController } from './controllers/user-profile/user-profile.controller';
import { UserProfileService } from './services/user-profile/user-profile.service';
import { PaymentsController } from './controllers/payments/payments.controller';
import FireBaseConfig from './config/firebase.config';
import { HttpModule } from '@nestjs/axios';
import { GameRoomGateway } from './gateways/game-room.gateway';
import { GameService } from './services/chat/game.service';
import { RealtimeDbService } from './services/realtime-db/realtime-db.service';
import { StripeWebhookController } from './controllers/stripe-webhook/stripe-webhook.controller';
import StripeConfig from './config/stripe.config';
import {GamePersistence} from './persistence/game.persistence';
import { GoldenBallsService } from './services/golden-balls/golden-balls.service';
import { MoneyPotService } from './services/money-pot/money-pot.service';
import { MessageService } from './services/message/message.service';
import { SplitOrStealService } from './services/split-or-steal/split-or-steal.service';

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
        GamePersistence,
        GameRoomGateway,
        GameService,
        RealtimeDbService,
        GoldenBallsService,
        MoneyPotService,
        MessageService,
        SplitOrStealService,
    ],
})
export class AppModule {}
