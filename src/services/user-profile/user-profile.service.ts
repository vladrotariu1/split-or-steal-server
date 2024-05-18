import { Injectable } from '@nestjs/common';
import {
    FirebaseStorage,
    getDownloadURL,
    ref,
    uploadBytes,
} from 'firebase/storage';
import { auth } from 'firebase-admin';
import FireBaseConfig from '../../config/firebase.config';
import { FileDto } from '../../data/dto/file.dto';

@Injectable()
export class UserProfileService {
    private readonly imagesStorage: FirebaseStorage;

    constructor(private firebaseConfig: FireBaseConfig) {
        this.imagesStorage = this.firebaseConfig.getImagesStorage();
    }

    async uploadProfilePicture(file: FileDto, userId: string) {
        const profilePictureRef = ref(
            this.imagesStorage,
            `profile-pictures/${userId}.${file.extension}`,
        );

        try {
            const metadata = {
                contentType: file.mimetype,
            };

            await uploadBytes(profilePictureRef, file.buffer, metadata);
            const photoUrl = await getDownloadURL(profilePictureRef);

            await this.updateUserPhoto(userId, photoUrl);

            return {
                newProfilePictureUrl: photoUrl,
            };
        } catch (error) {
            console.log('error', error);
        }
    }

    async updateUserPhoto(userId: string, photoUrl: string) {
        try {
            await auth().updateUser(userId, { photoURL: photoUrl });
        } catch (error) {
            console.log(error);
        }
    }

    findUserById(id: string) {
        return auth().getUser(id);
    }
}
