import {
    BadRequestException,
    ConflictException,
    HttpException,
    HttpStatus,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import {
    Auth,
    AuthError,
    AuthErrorCodes,
    createUserWithEmailAndPassword,
    getAuth,
    signInWithEmailAndPassword,
    UserCredential,
} from 'firebase/auth';
import {auth} from 'firebase-admin';
import FireBaseConfig from '../../config/firebase.config';
import {CreateUserDto} from '../../data/dto/create-user.dto';
import {LoginUserDto} from '../../data/dto/login-user.dto';
import {UserDetailsDto} from '../../data/dto/user-details.dto';
import {UserProfileService} from '../user-profile/user-profile.service';
import StripeConfig from '../../config/stripe.config';
import {RealtimeDbService} from '../realtime-db/realtime-db.service';

@Injectable()
export class AuthService {
    readonly firebaseAuth: Auth;

    constructor(
        private firebaseConfig: FireBaseConfig,
        private userProfileService: UserProfileService,
        private stripeConfig: StripeConfig,
        private realtimeDbService: RealtimeDbService,
    ) {
        this.firebaseAuth = getAuth(firebaseConfig.getFirebaseApp());
    }

    async createUser(createUserDto: CreateUserDto): Promise<UserDetailsDto> {
        try {
            const userCredentials = await createUserWithEmailAndPassword(
                this.firebaseAuth,
                createUserDto.email,
                createUserDto.password,
            );

            const stripeCustomer = await this.stripeConfig.getStripeApp().customers.create({
                email: createUserDto.email,
            });

            await this.realtimeDbService.createUserIdToStripeCustomerMapping(userCredentials.user.uid, stripeCustomer.id);
            await this.realtimeDbService.updateUserBalance(userCredentials.user.uid, 0);

            return this.getUserDetails(userCredentials);
        } catch (error) {
            throw this.userCreateExceptionHandler(error);
        }
    }

    async loginUser(loginUserDto: LoginUserDto): Promise<UserDetailsDto> {
        try {
            const userCredentials = await signInWithEmailAndPassword(
                this.firebaseAuth,
                loginUserDto.email,
                loginUserDto.password,
            );
            return this.getUserDetails(userCredentials);
        } catch (error) {
            throw this.userLoginExceptionHandler(error);
        }
    }

    async loginUserWithToken(authToken: string): Promise<UserDetailsDto> {
        try {
            const decodedToken = await this.verifyIdToken(authToken);
            const userRecord = await this.userProfileService.findUserById(decodedToken.uid);

            return {
                accessToken: authToken,
                email: userRecord.email || null,
                userId: userRecord.uid || null,
                userName: userRecord.displayName || null,
                userPhotoUrl: userRecord.photoURL || null
            };
        } catch (e) {
            console.log(e);
            throw new BadRequestException('Could not validate token');
        }
    }

    private async getUserDetails(
        userCredentials: UserCredential,
    ): Promise<UserDetailsDto> {
        const accessToken = await userCredentials.user.getIdToken();

        return {
            accessToken: accessToken,
            email: userCredentials.user.email,
            userId: userCredentials.user.uid,
            userName: userCredentials.user.displayName,
            userPhotoUrl: userCredentials.user.photoURL,
        };
    }
    verifyIdToken(token: string) {
        return auth().verifyIdToken(token);
    }

    private userLoginExceptionHandler(error: AuthError): HttpException {
        console.log(error);
        switch (error.code) {
            case AuthErrorCodes.INVALID_LOGIN_CREDENTIALS:
                return new UnauthorizedException('Invalid credentials');
            case AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER:
                return new HttpException(
                    'Too many login attempts',
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            default:
                console.log(error.code);
                return new BadRequestException();
        }
    }

    private userCreateExceptionHandler(error: AuthError | any): HttpException {
        console.log(error);
        switch (error.code) {
            case AuthErrorCodes.EMAIL_EXISTS:
                return new ConflictException('E-mail already used');
            case AuthErrorCodes.WEAK_PASSWORD:
                return new BadRequestException('Password is too weak');
            default:
                console.log(error.code);
                return new BadRequestException();
        }
    }
}
