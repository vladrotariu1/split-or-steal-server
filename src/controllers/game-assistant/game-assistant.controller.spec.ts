import { Test, TestingModule } from '@nestjs/testing';
import { GameAssistantController } from './game-assistant.controller';

describe('GameAssistantController', () => {
  let controller: GameAssistantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameAssistantController],
    }).compile();

    controller = module.get<GameAssistantController>(GameAssistantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
