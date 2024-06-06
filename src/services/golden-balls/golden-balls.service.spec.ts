import { Test, TestingModule } from '@nestjs/testing';
import { GoldenBallsService } from './golden-balls.service';

describe('GoldenBallsService', () => {
  let service: GoldenBallsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoldenBallsService],
    }).compile();

    service = module.get<GoldenBallsService>(GoldenBallsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
