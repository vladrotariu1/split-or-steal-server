export class GameConfing {
    public static readonly ROOM_SIZE = 4; // Maximum number of players in a Room

    public static readonly ROUND_DURATION = 2 * 60 * 1000;
    public static readonly PREPARE_ROUND_DURATION = 10 * 1000;

    public static readonly GAME_TAX = 5;
    public static readonly HOUSE_SPLIT_BONUS_PERCENTAGE = 0.5;
    public static readonly HOUSE_DOUBLE_STEAL_TAX_PERCENTAGE = 0.7;

    public static readonly BIG_BALLS_WEIGHT = 0.75;
    public static readonly MEDIUM_BALLS_WEIGHT = 0.2;
    public static readonly SMALL_BALLS_WEIGHT = 0.05;

    public static readonly NUMBER_OF_BIG_BALLS_PER_PLAYER = 1;
    public static readonly NUMBER_OF_MEDIUM_BALLS_PER_PLAYER = 2;
    public static readonly NUMBER_OF_SMALL_BALLS_PER_PLAYER = 1;
    public static readonly NUMBER_OF_KILLER_BALLS_PER_PLAYER = 1;
    public static readonly NUMBER_OF_BALLS_PER_PLAYER =
        this.NUMBER_OF_BIG_BALLS_PER_PLAYER +
        this.NUMBER_OF_MEDIUM_BALLS_PER_PLAYER +
        this.NUMBER_OF_SMALL_BALLS_PER_PLAYER +
        this.NUMBER_OF_KILLER_BALLS_PER_PLAYER
}