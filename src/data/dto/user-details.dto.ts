export interface UserDetailsDto {
    accessToken: string;
    balance: number;
    email: string;
    userId: string;
    userName: string;
    userPhotoUrl: string;
}

export interface ChatUserDetailsDto extends Pick<UserDetailsDto, 'userId' | 'userName' | 'userPhotoUrl'> {}
