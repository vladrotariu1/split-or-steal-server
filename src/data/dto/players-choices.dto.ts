import {SplitOrStealChoices} from '../enums/split-or-steal-choices';

export interface PlayerChoice {
    id: string,
    choice: SplitOrStealChoices
}

export interface PlayersChoices {
    player1: PlayerChoice,
    player2: PlayerChoice
}
