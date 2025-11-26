import { BadRequestException } from '@nestjs/common';
import { OrderService } from '../../order.service';
import { Order } from '../../entities/order.entity';
import { OrderMapper } from '../../mappers/order.mapper';

describe('OrderService (unit) - prioritized methods', () => {
  let service: OrderService;

  // Mocks for constructor dependencies
  const mockConfigService = {} as any;
  const mockWalletService = {} as any;
  const mockOrderRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as any;
  const mockOrderTrackingRepo = {} as any;
  const mockEventBus = { publish: jest.fn() } as any;
  const mockCalculateUsecase = {} as any;
  const mockRiderService = { getRiderForOrder: jest.fn() } as any;
  const mockDataSource = {} as any;
  const mockRiderGateway = { notifyRiderNewOrder: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // instantiate service directly with mocks (avoids Test.createTestingModule complexity)
    service = new OrderService(
      mockConfigService,
      mockWalletService,
      mockOrderRepo,
      mockOrderTrackingRepo,
      mockEventBus,
      mockCalculateUsecase,
      mockRiderService,
      mockDataSource,
      mockRiderGateway,
    );
  });

  describe('assignRiderToOrder', () => {
    it('throws when order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.assignRiderToOrder('missing-order')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockOrderRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'missing-order' },
      });
    });

    it('returns void when no rider is available (not an error)', async () => {
      const order: Partial<Order> = {
        id: 'o-1',
        declinedRiderIds: [],
        pickUpLocation: undefined,
      };
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockRiderService.getRiderForOrder.mockResolvedValue(null);

      const res = await service.assignRiderToOrder('o-1');

      // No rider found -> function returns undefined (not an error)
      expect(res).toBeUndefined();
      expect(mockOrderRepo.findOne).toHaveBeenCalled();
      expect(mockRiderService.getRiderForOrder).toHaveBeenCalledWith(
        [],
        undefined,
      );
      expect(mockOrderRepo.update).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
      expect(mockRiderGateway.notifyRiderNewOrder).not.toHaveBeenCalled();
    });

    it('assigns rider when one is available and triggers notifications', async () => {
      const order: Partial<Order> = {
        id: 'o-2',
        declinedRiderIds: ['r-declined'],
        pickUpLocation: {
          longitude: '3.1319',
          latitude: '6.5244',
          address: 'Pickup Addr',
        } as any,
        deliveryFee: 1200,
      };
      const riderId = 'rider-123';

      mockOrderRepo.findOne.mockResolvedValue(order);
      // return a rider id
      mockRiderService.getRiderForOrder.mockResolvedValue(riderId);

      // spy on OrderMapper to control the assigned payload passed to the gateway
      const mappedAssigned = { id: 'o-2', representative: true };
      const spyMap = jest
        .spyOn(OrderMapper, 'mapToAssignedOrder')
        .mockReturnValue(mappedAssigned as any);

      // run
      const res = await service.assignRiderToOrder('o-2');

      // expectations
      expect(mockOrderRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'o-2' },
      });
      expect(mockRiderService.getRiderForOrder).toHaveBeenCalled();
      expect(mockOrderRepo.update).toHaveBeenCalledWith('o-2', {
        riderId,
        riderAssigned: true,
        riderAssignedAt: expect.any(Date),
      });
      // event publish and gateway notify should be invoked
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(mockRiderGateway.notifyRiderNewOrder).toHaveBeenCalledWith(
        riderId,
        mappedAssigned,
      );
      // response should be a successful StandardResponse wrapper (truthy success)
      expect(res).toBeDefined();
      expect((res as any)?.success).toBe(true);
      // cleanup spy
      spyMap.mockRestore();
    });
  });

  describe('getActiveOrders', () => {
    it('calls repository query builder and returns mapped active orders', async () => {
      const fakeOrders = [{ id: 'o-a1' }, { id: 'o-a2' }];
      // create a chainable query builder mock
      const qb: any = {
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(fakeOrders),
      };
      mockOrderRepo.createQueryBuilder.mockReturnValue(qb);

      // spy on mapper result
      const mapped = [{ orderId: 'o-a1' }, { orderId: 'o-a2' }];
      const spy = jest
        .spyOn(OrderMapper, 'mapToActiveOrders')
        .mockReturnValue(mapped as any);

      const result = await service.getActiveOrders('r-1');

      // ensure we invoked the builder and mapper
      expect(mockOrderRepo.createQueryBuilder).toHaveBeenCalledWith('o');
      expect(qb.leftJoin).toHaveBeenCalled();
      expect(qb.leftJoinAndSelect).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalled();
      expect(qb.getMany).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(fakeOrders);
      expect(result).toEqual(mapped);

      spy.mockRestore();
    });
  });

  describe('getAssignedOrders', () => {
    it('calls repository query builder and returns mapped assigned orders', async () => {
      const fakeOrders = [{ id: 'o-b1' }];
      const qb: any = {
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(fakeOrders),
      };
      mockOrderRepo.createQueryBuilder.mockReturnValue(qb);

      const mappedAssigned = [{ id: 'mapped-1' }];
      const spy = jest
        .spyOn(OrderMapper, 'mapToAssignedOrders')
        .mockReturnValue(mappedAssigned as any);

      const result = await service.getAssignedOrders('r-2');

      expect(mockOrderRepo.createQueryBuilder).toHaveBeenCalledWith('o');
      expect(qb.leftJoin).toHaveBeenCalled();
      expect(qb.leftJoinAndSelect).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalled();
      expect(qb.getMany).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(fakeOrders);
      expect(result).toEqual(mappedAssigned);

      spy.mockRestore();
    });
  });
});
