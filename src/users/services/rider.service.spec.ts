import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RiderService } from './rider.service';
import { RiderInfo } from '../rider-info.entity';
import { ActiveStatus } from '../active-status.entity';
import { Order } from '../../order/entities/order.entity';
import { ActiveStatusService } from './active-status.service';

describe('RiderService', () => {
  let service: RiderService;

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiderService,
        {
          provide: ActiveStatusService,
          useValue: {
            initialize: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RiderInfo),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ActiveStatus),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RiderService>(RiderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRiderForOrder', () => {
    it('should return null when no riders are available', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.getRiderForOrder();

      expect(result).toBeNull();
    });

    it('should return the first available rider when no pickup location is provided', async () => {
      const mockRiders = [
        {
          userId: 'rider-1',
          latitude: '6.5244',
          longitude: '3.3792',
          activeOrderCount: '2',
        },
        {
          userId: 'rider-2',
          latitude: '6.5300',
          longitude: '3.3800',
          activeOrderCount: '3',
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockRiders);

      const result = await service.getRiderForOrder();

      expect(result).toBe('rider-1');
      expect(mockQueryBuilder.having).toHaveBeenCalled();
    });

    it('should return the closest rider when pickup location is provided', async () => {
      const pickupLocation: [number, number] = [3.3792, 6.5244]; // [lon, lat] - Lagos, Nigeria

      const mockRiders = [
        {
          userId: 'rider-1',
          latitude: '6.5244',
          longitude: '3.3792',
          activeOrderCount: '2',
        },
        {
          userId: 'rider-2',
          latitude: '6.6000',
          longitude: '3.4000',
          activeOrderCount: '1',
        },
        {
          userId: 'rider-3',
          latitude: '6.4500',
          longitude: '3.3500',
          activeOrderCount: '3',
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockRiders);

      const result = await service.getRiderForOrder([], pickupLocation);

      // rider-1 should be selected as closest (distance ≈ 0km)
      expect(result).toBe('rider-1');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining(
          'CAST(activeStatus.latitude AS DECIMAL) BETWEEN',
        ),
        expect.any(Object),
      );
    });

    it('should exclude specified rider IDs', async () => {
      const excludeRiderIds = ['rider-1', 'rider-2'];
      const mockRiders = [
        {
          userId: 'rider-3',
          latitude: '6.5244',
          longitude: '3.3792',
          activeOrderCount: '1',
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockRiders);

      const result = await service.getRiderForOrder(excludeRiderIds);

      expect(result).toBe('rider-3');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'activeStatus.userId NOT IN (:...excludeRiderIds)',
        { excludeRiderIds },
      );
    });

    it('should apply bounding box filter when pickup location is provided', async () => {
      const pickupLocation: [number, number] = [3.3792, 6.5244];
      const mockRiders = [
        {
          userId: 'rider-1',
          latitude: '6.5244',
          longitude: '3.3792',
          activeOrderCount: '2',
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockRiders);

      await service.getRiderForOrder([], pickupLocation);

      // Verify bounding box constraints were applied
      const latitudeCalls = mockQueryBuilder.andWhere.mock.calls.filter(
        (call) => call[0].includes('latitude'),
      );
      const longitudeCalls = mockQueryBuilder.andWhere.mock.calls.filter(
        (call) => call[0].includes('longitude'),
      );

      expect(latitudeCalls.length).toBeGreaterThan(0);
      expect(longitudeCalls.length).toBeGreaterThan(0);
    });

    it('should fall back to riders over limit when no riders under limit are available', async () => {
      const mockRidersUnderLimit: any[] = [];
      const mockRidersOverLimit = [
        {
          userId: 'rider-busy-1',
          latitude: '6.5244',
          longitude: '3.3792',
          activeOrderCount: '5',
        },
        {
          userId: 'rider-busy-2',
          latitude: '6.5300',
          longitude: '3.3800',
          activeOrderCount: '6',
        },
      ];

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce(mockRidersUnderLimit)
        .mockResolvedValueOnce(mockRidersOverLimit);

      const result = await service.getRiderForOrder();

      expect(result).toBe('rider-busy-1');
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalledTimes(2);
    });

    it('should return null when no riders are available even over limit', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getRiderForOrder();

      expect(result).toBeNull();
    });

    it('should select closest rider among over-limit riders when pickup location provided', async () => {
      const pickupLocation: [number, number] = [3.3792, 6.5244];
      const mockRidersUnderLimit: any[] = [];
      const mockRidersOverLimit = [
        {
          userId: 'rider-busy-1',
          latitude: '6.5244',
          longitude: '3.3792',
          activeOrderCount: '5',
        },
        {
          userId: 'rider-busy-2',
          latitude: '6.6000',
          longitude: '3.4000',
          activeOrderCount: '6',
        },
      ];

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce(mockRidersUnderLimit)
        .mockResolvedValueOnce(mockRidersOverLimit);

      const result = await service.getRiderForOrder([], pickupLocation);

      // rider-busy-1 should be selected as closest (distance ≈ 0km)
      expect(result).toBe('rider-busy-1');
    });

    it('should filter riders without latitude or longitude', async () => {
      const pickupLocation: [number, number] = [3.3792, 6.5244];

      const mockRiders = [
        {
          userId: 'rider-1',
          latitude: '6.5244',
          longitude: '3.3792',
          activeOrderCount: '2',
        },
        {
          userId: 'rider-2',
          latitude: null,
          longitude: '3.3800',
          activeOrderCount: '1',
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockRiders);

      const result = await service.getRiderForOrder([], pickupLocation);

      // Should only consider rider-1 since rider-2 has null latitude
      expect(result).toBe('rider-1');
    });

    it('should correctly calculate distance using Haversine formula', async () => {
      const pickupLocation: [number, number] = [3.3792, 6.5244]; // Victoria Island, Lagos

      const mockRiders = [
        {
          userId: 'rider-close',
          latitude: '6.5255', // ~1.2 km away
          longitude: '3.3800',
          activeOrderCount: '2',
        },
        {
          userId: 'rider-far',
          latitude: '6.6000', // ~8.5 km away
          longitude: '3.4000',
          activeOrderCount: '1',
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockRiders);

      const result = await service.getRiderForOrder([], pickupLocation);

      // Should select the closer rider even though they have more orders
      expect(result).toBe('rider-close');
    });

    it('should limit results to 100 candidates for performance', async () => {
      const mockRiders = Array.from({ length: 50 }, (_, i) => ({
        userId: `rider-${i}`,
        latitude: '6.5244',
        longitude: '3.3792',
        activeOrderCount: '2',
      }));

      mockQueryBuilder.getRawMany.mockResolvedValue(mockRiders);

      await service.getRiderForOrder();

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
    });

    it('should apply MAX_ACTIVE_ORDERS filter of 5 orders', async () => {
      const mockRiders = [
        {
          userId: 'rider-1',
          latitude: '6.5244',
          longitude: '3.3792',
          activeOrderCount: '4',
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockRiders);

      await service.getRiderForOrder();

      expect(mockQueryBuilder.having).toHaveBeenCalledWith(
        expect.stringContaining('< :maxOrders'),
        { maxOrders: 5 },
      );
    });
  });
});
