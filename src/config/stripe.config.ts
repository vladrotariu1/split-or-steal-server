import {Injectable} from '@nestjs/common';
import Stripe from 'stripe';
import * as process from 'process';

@Injectable()
export default class StripeConfig {
    private readonly stripeApp;

    constructor() {
        this.stripeApp = new Stripe(process.env.STRIPE_API_SECRET_KEY);
        console.log(this.stripeApp);
    }

    getStripeApp() {
        return this.stripeApp;
    }
}