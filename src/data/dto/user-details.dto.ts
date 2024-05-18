export interface UserDetailsDto {
    accessToken: string;
    email: string;
    userId: string;
    userName: string;
    userPhotoUrl: string;
}

export interface ChatUserDetailsDto extends Pick<UserDetailsDto, 'userId' | 'userName' | 'userPhotoUrl'> {}
