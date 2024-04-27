import { Injectable } from '@nestjs/common';
import { initializeApp } from 'firebase/app';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { initializeApp as initializeAdminApp, cert } from 'firebase-admin/app';
import * as process from 'process';

@Injectable()
export default class FireBaseConfig {
    private readonly firebaseApp;
    private readonly imagesStorage: FirebaseStorage;

    constructor() {
        const serviceAccount = require('../../secrets/' +
            process.env.SERVICE_ACCOUNT_KEY_FILE_NAME);

        const firebaseConfig = {
            apiKey: process.env.API_KEY,
            authDomain: process.env.AUTH_DOMAIN,
            projectId: process.env.PROJECT_ID,
            storageBucket: process.env.STORAGE_BUCKET,
            messagingSenderId: process.env.MESSAGING_SENDER_ID,
            appId: process.env.APP_ID,
            measurementId: process.env.MEASUREMENT_ID,
        };

        this.firebaseApp = initializeApp(firebaseConfig);
        initializeAdminApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.IMAGES_STORAGE_BUCKET,
        });

        this.imagesStorage = getStorage(this.firebaseApp);
        console.log(this.imagesStorage);
    }

    getFirebaseApp() {
        return this.firebaseApp;
    }

    getImagesStorage() {
        return this.imagesStorage;
    }
}
