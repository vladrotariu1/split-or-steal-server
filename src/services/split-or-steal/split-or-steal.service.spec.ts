import { Test, TestingModule } from '@nestjs/testing';
import { SplitOrStealService } from './split-or-steal.service';

describe('SplitOrStealService', () => {
  let service: SplitOrStealService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SplitOrStealService],
    }).compile();

    service = module.get<SplitOrStealService>(SplitOrStealService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
