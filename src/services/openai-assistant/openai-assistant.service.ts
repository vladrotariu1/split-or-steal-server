import { Injectable } from '@nestjs/common';
import {OpenaiConfig} from '../../config/openai.config';
import {OpenaiGoldenBallsDeclarationAdvice} from '../../data/models/openai-golden-balls-declaration-advice';
import {OpenaiUserToKickAdvice} from '../../data/models/openai-user-to-kick-advice';
import {WebSocketConfig} from '../../config/web-socket.config';
import {GamePersistence} from '../../persistence/game.persistence';

@Injectable()
export class OpenaiAssistantService {
    readonly assistantId = "asst_ozDkcCWeHMcQdFynh8gDNdI7";
    readonly threadId = "thread_HzboSfrFYorWllxG3mNb9p1n";
    private runInProgress = false;

    constructor(
        private openaiConfig: OpenaiConfig,
        private wsConfig: WebSocketConfig,
        private gamePersistence: GamePersistence
    ) { }

    async getAssistantBallDeclarationAdvice(
        roomPot: number,
        displayedGoldenBallsValues: number[],
        hiddenGoldenBallsValues: number[],
        userId: string
    ) {
        const promptResponseExample: OpenaiGoldenBallsDeclarationAdvice =  {
            values: [1, 2, 1],
            inDanger: true,
            shouldLie: true,
            lieChoiceReason: "You should lie because the displayed balls contain a KILLER ball"
        }
        const prompt = `
            Value -1 represents a KILLER ball.
            There are 4 players in the room. The game pot is ${roomPot}. 
            My displayed balls are ${displayedGoldenBallsValues.join(' and ')}. 
            My hidden balls are ${hiddenGoldenBallsValues.join(', ')}. 
            A ball can have a maximum value of 7.5 and a minimum of 0.5. 
            Give me the values that i should declare on the 3 hidden balls. 
            Tell me if I am in danger of being kicked or not. 
            Tell me if I should lie or not. 
            Give me a short reason why I should lie or not. 
            The return object should be of json type and have the following form: 
            ${JSON.stringify(promptResponseExample)}
        `
        console.log(prompt);
        await this.createRun(prompt, userId, 'golden-balls-declaration-advice');
    }

    async getAssistantUserToKickAdvice(
        goldenBallsAssignments: { playerId: string, shownGoldenBalls: number[] }[],
        roomPot: number,
        userId: string
    ) {
        const promptResponseExample: OpenaiUserToKickAdvice = {
            userId: "Nkh9BaM7QBhQ5cDFh0e4Wgv7MnK2",
            reason: "You should kick user Nkh9BaM7QBhQ5cDFh0e4Wgv7MnK2 because the values sum on his golden balls is very low"
        }

        const prompt = `
            Value -1 represents a KILLER ball.
            There are 4 players in the room. The game pot is ${roomPot}. 
            ${
                goldenBallsAssignments.map(goldenBallAssignment => `
                    User ${goldenBallAssignment.playerId} has the following displayed balls: ${goldenBallAssignment.shownGoldenBalls.join(', ')}
                `)
            }   
            A ball can have a maximum value of 7.5 and a minimum of 0.5. 
            Give me the id of the user that i should kick.
            Give me a short reason why I should kick this user.
            Try to kick a user that has killer balls, but you should also decide if 
            the user you want to kick can be trusted in the later rounds. 
            REMEMBER that if the user has a killer ball BUT a big amount of money on the other balls, the MONEY POT can be drastically 
            reduced if he is kicked, which can be very bad for the players that will continue to play the game. 
            So you should have second thoughts and perhaps think about other player to kick.
            Take all these factors into consideration when you take the decision.
            The return object should be of json type and have the following form: 
            ${JSON.stringify(promptResponseExample)}
        `
        console.log(prompt);
        await this.createRun(prompt, userId, 'user-to-kick-advice');
    }

    async getAssistantMessageToConvinceOpponentToSplit(userId: string) {
        const prompt = `
           Congratulations, you are now playing Split or Steal.
           The best strategy is to STEAL, so I need a message to send to the other user.
           The message must convince him to SPLIT.
           The message must be maximum 15 words long.
           The message should be informal and relaxed.
           The message should give the impression that you will SPLIT
        `
        console.log(prompt);
        await this.createRun(prompt, userId, 'message-to-convince-opponent-to-split', false);
    }

    private async createRun(prompt: string, userId: string, adviceType: string, convertToJson=true) {
        const interval = setInterval(async () => {
            console.log('in interval');
            if (this.runInProgress) {
                console.log("Waiting..run still in progress");
            }
            else {
                console.log('creating run...', this.runInProgress);
                 await this.openaiConfig.getOpenAi().beta.threads.messages.create(this.threadId, {
                    role: "user",
                    content: prompt
                });

                this.runInProgress = true;
                this.openaiConfig.getOpenAi().beta.threads.runs.stream(this.threadId, {
                    assistant_id: this.assistantId
                })
                    .on('textCreated', (text) => console.log('\nassistant > '))
                    .on('textDone', (content, snapshot) => {
                        console.log(content.value)
                        if (convertToJson) {
                            try {
                                const responseJsonObject = JSON.parse(content.value);
                                this.emitMessageToUser(userId, adviceType, responseJsonObject);
                            } catch (error) {
                                console.error('Assistant returned invalid json string', error);
                            }
                        } else {
                            this.emitMessageToUser(userId, adviceType, content.value);
                        }

                    })
                    .on('error', (event) => console.log('some error nik'))
                    .on('abort', (event) => console.log('aborted'))
                    .on('end', () => {
                        console.log('Assistant Run is done');
                        this.runInProgress = false
                    });

                clearInterval(interval);
            }

        }, 1000);
    }

    private emitMessageToUser(userId: string, eventName: string, message: any) {
        const socketId = this.gamePersistence.getSocketByUserId(userId);

        if (!socketId) {
            console.log(`Can not emit response. User ${userId} has no socket bind.`);
            return;
        }

        this.wsConfig.getWsServer().to(socketId).emit(eventName, message);
    }
}
