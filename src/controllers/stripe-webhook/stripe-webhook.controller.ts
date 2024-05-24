import {BadRequestException, Body, Controller, Headers, Post, RawBodyRequest, Request} from '@nestjs/common';
import StripeConfig from '../../config/stripe.config';
import * as process from 'process';
import {RealtimeDbService} from '../../services/realtime-db/realtime-db.service';

@Controller('stripe-webhook')
export class StripeWebhookController {
    readonly webhookSecret: string;

    constructor(private stripeConfig: StripeConfig, private realtimeDbService: RealtimeDbService) {
        this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    }

    @Post()
    async stripeWebhook(@Headers() headers, @Body() payload, @Request() req: RawBodyRequest<Request>) {
        const sig = headers['stripe-signature'];

        let event;

        try {
            event = this.stripeConfig.getStripeApp().webhooks.constructEvent(req.rawBody, sig, this.webhookSecret);
        } catch (err) {
            throw new BadRequestException('Webhook Error');
        }

        switch (event.type) {
            case 'checkout.session.async_payment_succeeded':
            case 'checkout.session.completed':
                try {
                    const session = event.data.object;
                    const stripeCustomerId = session.customer;
                    const creditAdded = session.amount_total / 100;
                    const firebaseId = await this.realtimeDbService.getFirebaseUserId(stripeCustomerId);

                    await this.realtimeDbService.updateUserBalance(firebaseId, creditAdded, true);

                } catch (e) {
                    console.log(e);
                }
                break;

            case 'checkout.session.async_payment_failed': {
                const session = event.data.object;

                console.log('payment failed');

                break;
            }
        }
    }
}
