import { Test, TestingModule } from '@nestjs/testing';
import { MoneyPotService } from './money-pot.service';

describe('MoneyPotService', () => {
  let service: MoneyPotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoneyPotService],
    }).compile();

    service = module.get<MoneyPotService>(MoneyPotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
