import { EventMonitor } from '../src/monitor';
import { DatabaseClient } from '../src/database';
import { RedisClient } from '../src/redis';
import { CustodyChangedEvent } from '../src/types';

jest.mock('../src/database');
jest.mock('../src/redis');
jest.mock('ethers');

describe('EventMonitor', () => {
  let eventMonitor: EventMonitor;
  let mockDb: jest.Mocked<DatabaseClient>;
  let mockRedis: jest.Mocked<RedisClient>;

  beforeEach(() => {
    mockDb = {
      prisma: {
        custodyEvent: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
      },
    } as any;

    mockRedis = {
      addMirrorOperation: jest.fn(),
    } as any;

    eventMonitor = new EventMonitor(mockDb, mockRedis);
  });

  describe('processCustodyEvent', () => {
    it('should process new custody event and queue mirror operation', async () => {
      const event: CustodyChangedEvent = {
        domainTokenId: '1',
        newCustodian: '0x1234567890123456789012345678901234567890',
        action: 'escrow',
        txHash: '0xabcd',
        blockNumber: 12345,
        logIndex: 0,
      };

      mockDb.prisma.custodyEvent.findUnique.mockResolvedValue(null);
      mockDb.prisma.custodyEvent.create.mockResolvedValue({
        id: 'event-1',
        ...event,
      } as any);

      await eventMonitor['processCustodyEvent'](event);

      expect(mockDb.prisma.custodyEvent.create).toHaveBeenCalledWith({
        data: {
          domainTokenId: '1',
          circleAddress: '0x1234567890123456789012345678901234567890',
          inVault: false,
          txHash: '0xabcd',
          blockNumber: BigInt(12345),
          logIndex: 0,
        },
      });

      expect(mockRedis.addMirrorOperation).toHaveBeenCalledWith({
        custodyEventId: 'event-1',
        operation: 'mint',
        domainTokenId: '1',
        circleAddress: '0x1234567890123456789012345678901234567890',
      });
    });

    it('should skip processing if event already exists', async () => {
      const event: CustodyChangedEvent = {
        domainTokenId: '1',
        newCustodian: '0x1234567890123456789012345678901234567890',
        action: 'escrow',
        txHash: '0xabcd',
        blockNumber: 12345,
        logIndex: 0,
      };

      mockDb.prisma.custodyEvent.findUnique.mockResolvedValue({
        id: 'existing-event',
      } as any);

      await eventMonitor['processCustodyEvent'](event);

      expect(mockDb.prisma.custodyEvent.create).not.toHaveBeenCalled();
      expect(mockRedis.addMirrorOperation).not.toHaveBeenCalled();
    });
  });
});
