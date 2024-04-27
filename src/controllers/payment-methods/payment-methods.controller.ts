import {
    Body,
    Controller,
    Get,
    HttpException,
    Post,
    UseGuards,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
    CreatePaymentMethodDto,
    PaymentMethodDto,
} from '../../dto/payment-method.dto';
import { VerifyAuthTokenGuard } from '../../guards/verify-auth-token.guard';

@Controller('payment-methods')
export class PaymentMethodsController {
    constructor(private httpService: HttpService) {}

    @UseGuards(VerifyAuthTokenGuard)
    @Get()
    async getPaymentMethods() {
        const result: PaymentMethodDto[] = (
            await this.httpService.axiosRef.get(
                'http://localhost:3005/payment-methods',
            )
        ).data;

        return result;
    }

    @Post()
    async createPaymentMethod(
        @Body() paymentMethod: Omit<CreatePaymentMethodDto, 'owner'>,
    ) {
        const newPaymentMethod: CreatePaymentMethodDto = {
            ...paymentMethod,
            owner: 'vlad',
        };

        try {
            const result: PaymentMethodDto = (
                await this.httpService.axiosRef.post(
                    'http://localhost:3005/payment-method',
                    newPaymentMethod,
                )
            ).data;

            return result;
        } catch (error) {
            console.log(error.response.data);
            throw new HttpException(
                error.response.data.errorMessage,
                error.response.data.errorCode,
            );
        }
    }
}
