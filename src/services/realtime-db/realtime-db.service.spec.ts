import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeDbService } from './realtime-db.service';

describe('RealtimeDbService', () => {
  let service: RealtimeDbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeDbService],
    }).compile();

    service = module.get<RealtimeDbService>(RealtimeDbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
