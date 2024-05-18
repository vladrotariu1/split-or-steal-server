export interface PaymentMethodDto {
    id: string;
    cardNumber: string;
    expiryDate: string;
    cardHolder: string;
    owner: string;
}

export interface CreatePaymentMethodDto {
    cardNumber: string;
    expiryDate: string;
    cardHolder: string;
    owner: string;
}
