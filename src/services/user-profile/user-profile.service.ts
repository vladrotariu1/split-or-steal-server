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
import {collection, doc, getDoc, getDocs, getFirestore, or, query, where} from 'firebase/firestore';
import {SplitOrStealChoices} from '../../data/enums/split-or-steal-choices';

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

    async getGameMessages(gameId: string) {
        const conversationDocRef = doc(
            getFirestore(),
            'conversations',
            gameId
        );
        const docSnap = await getDoc(conversationDocRef);
        return docSnap.data().messages;
    }

    async getUserGameDocs(userId: string) {
        const q = query(
            collection(getFirestore(), 'conversations'),
            or(
                where("player1Id", "==", userId),
                where("player2Id", "==", userId)
            )
        );
        return await getDocs(q);
    }

    async getUserGameHistory(userId: string) {
        const gameDocsSnapshot = await this.getUserGameDocs(userId);
        return Promise.all(
            gameDocsSnapshot.docs.map(async (doc) => {
                let opponentId;
                let opponentChoice;
                let currentPlayerChoice;

                if (doc.data().player1Id === userId) {
                    opponentId = doc.data().player2Id;
                    opponentChoice = doc.data().player2Choice || SplitOrStealChoices.STEAL;
                    currentPlayerChoice = doc.data().player1Choice || SplitOrStealChoices.STEAL;
                } else {
                    opponentId = doc.data().player1Id;
                    opponentChoice = doc.data().player1Choice || SplitOrStealChoices.STEAL;
                    currentPlayerChoice = doc.data().player2Choice || SplitOrStealChoices.STEAL;
                }

                const opponentName = (await this.findUserById(opponentId)).email;
                const creationDate = doc.data().creationDate;

                return {
                    id: doc.id,
                    creationDate,
                    currentPlayerChoice,
                    opponentChoice,
                    opponentName,
                }
            })
        );
    }

    async getUserStatistics(userId: string) {
        const gameDocsSnapshot = await this.getUserGameDocs(userId);

        let numberOfLoses = 0;
        let numberOfSplits = 0;
        let numberOfSteals = 0;

        for (const doc of gameDocsSnapshot.docs) {
            let opponentChoice;
            let currentPlayerChoice;

            if (doc.data().player1Id === userId) {
                opponentChoice = doc.data().player2Choice || SplitOrStealChoices.STEAL;
                currentPlayerChoice = doc.data().player1Choice || SplitOrStealChoices.STEAL;
            } else {
                opponentChoice = doc.data().player1Choice || SplitOrStealChoices.STEAL;
                currentPlayerChoice = doc.data().player2Choice || SplitOrStealChoices.STEAL;
            }

            if (opponentChoice === currentPlayerChoice && currentPlayerChoice === SplitOrStealChoices.SPLIT) {
                numberOfSplits += 1;
            } else if (opponentChoice === currentPlayerChoice && currentPlayerChoice === SplitOrStealChoices.STEAL) {
                numberOfLoses += 1;
            } else if (opponentChoice === SplitOrStealChoices.STEAL && currentPlayerChoice === SplitOrStealChoices.SPLIT) {
                numberOfLoses += 1
            } else if (opponentChoice === SplitOrStealChoices.SPLIT && currentPlayerChoice === SplitOrStealChoices.STEAL) {
                numberOfSteals += 1
            }
        }

        return { numberOfLoses, numberOfSplits, numberOfSteals };
    }
}
