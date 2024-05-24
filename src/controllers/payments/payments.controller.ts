import {
    Body,
    Controller,
    Get,
    Headers,
    HttpException,
    Post,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
    CreatePaymentMethodDto,
    PaymentMethodDto,
} from '../../data/dto/payment-method.dto';
import { VerifyAuthTokenGuard } from '../../guards/verify-auth-token.guard';
import StripeConfig from '../../config/stripe.config';
import {RealtimeDbService} from '../../services/realtime-db/realtime-db.service';

@Controller('payments')
export class PaymentsController {
    constructor(private httpService: HttpService, private stripeConfig: StripeConfig, private realtimeDbService: RealtimeDbService) {}

    @UseGuards(VerifyAuthTokenGuard)
    @Post('create-checkout-session')
    async createCheckoutSessionController(@Headers() headers, @Request() request) {
        const userId = request.userId;
        const origin = headers.origin;
        const stripeApp = this.stripeConfig.getStripeApp();
        const stripeCustomerId = await this.realtimeDbService.getStripeCustomerId(userId);
        const session = await stripeApp.checkout.sessions.create({
            customer: stripeCustomerId,
            ui_mode: 'embedded',
            line_items: [
                {
                    price: 'price_1PJuzqGfaRFRNv7cheRM53f7',
                    quantity: 1
                }
            ],
            mode: 'payment',
            return_url: `${origin}/payments-return?session-id={CHECKOUT_SESSION_ID}`
        });

        return {clientSecret: session.client_secret};
    }

    @Get('session-status')
    async getSessionStatusController(@Query('session-id') sessionId: string) {
        const session = await this.stripeConfig.getStripeApp().checkout.sessions.retrieve(sessionId);

        return {
            status: session.status,
            customer_email: session.customer_details.email
        };
    }
}
