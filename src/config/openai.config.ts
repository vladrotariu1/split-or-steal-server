import {Injectable} from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenaiConfig {
    readonly openai: OpenAI;

    constructor() {
        this.openai = new OpenAI();
    }

    getOpenAi() {
        return this.openai;
    }
}
