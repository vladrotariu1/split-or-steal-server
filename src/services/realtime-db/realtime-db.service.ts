import { Injectable } from '@nestjs/common';
import FireBaseConfig from '../../config/firebase.config';
import { Database, get, getDatabase, ref, set } from 'firebase/database';

@Injectable()
export class RealtimeDbService {
    private readonly realtimeDb: Database;

    constructor(private firebaseConfig: FireBaseConfig) {
        this.realtimeDb = getDatabase(firebaseConfig.getFirebaseApp());
    }

    async createUserIdToStripeCustomerMapping(firebaseUserId: string, stripeCustomerId: string) {
        await set(ref(this.realtimeDb, `/ids-map/${firebaseUserId}`), stripeCustomerId);
    }

    async getStripeCustomerId(firebaseUserId: string) {
        const snapshot = await get(ref(this.realtimeDb, '/ids-map'));
        return snapshot.val()[firebaseUserId];
    }

    async getFirebaseUserId(stripeCustomerId: string) {
        const snapshot = await get(ref(this.realtimeDb, '/ids-map'));
        const mapObject = snapshot.val();
        return Object.keys(mapObject).find(key => mapObject[key] === stripeCustomerId);
    }

    async updateUserBalance(userId: string, creditToAdd: number, addition = false) {
        const balanceDocRef = ref(this.realtimeDb, `/users-balance/${userId}`);

        let newBalance = creditToAdd;

        if (addition) {
            const currentUserBalance = (await get(balanceDocRef)).val();
            newBalance = currentUserBalance + creditToAdd;
        }

        await set(balanceDocRef, newBalance);

    }
}
