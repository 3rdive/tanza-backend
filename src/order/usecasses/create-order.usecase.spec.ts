import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateOrderUsecase } from './create-order.usecase';
import { CalculateDeliveryChargesUsecase } from './calculate-delivery-charges.usecase';
import { WalletService } from '../../wallet/services/wallet.service';
import { Order } from '../entities/order.entity';
import { OrderTracking } from '../entities/order-tracking.entity';
import { DeliveryDestination } from '../entities/delivery-destination.entity';
import { CreateMultipleDeliveryOrderDto } from '../dto/create-multiple-delivery-order.dto';
import { UserOrderRole } from '../entities/user-order-role.enum';
import { VehicleType } from '../entities/vehicle-type.enum';
import { RiderService } from '../../users/services/rider.service';

describe('CreateOrderUsecase', () => {
  let usecase: CreateOrderUsecase;
  let calculateDeliveryChargesUsecase: jest.Mocked<CalculateDeliveryChargesUsecase>;
  let walletService: jest.Mocked<WalletService>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const mockCalculateDeliveryChargesUsecase = {
      calculateMultipleDeliveryFee: jest.fn(),
    };

    const mockWalletService = {
      getUserWallet: jest.fn(),
    };

    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        getRepository: jest.fn(),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderUsecase,
        {
          provide: getRepositoryToken(Order),
          useValue: {},
        },
        {
          provide: getRepositoryToken(OrderTracking),
          useValue: {},
        },
        {
          provide: getRepositoryToken(DeliveryDestination),
          useValue: {},
        },
        {
          provide: CalculateDeliveryChargesUsecase,
          useValue: mockCalculateDeliveryChargesUsecase,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: RiderService,
          useValue: {
            getRiderForOrder: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    usecase = module.get<CreateOrderUsecase>(CreateOrderUsecase);
    calculateDeliveryChargesUsecase = module.get(
      CalculateDeliveryChargesUsecase,
    );
    walletService = module.get(WalletService);
    dataSource = module.get(DataSource);
  });

  describe('createMultipleDeliveryOrder', () => {
    it('should calculate delivery charges correctly', async () => {
      const userId = 'user-123';
      const dto: CreateMultipleDeliveryOrderDto = {
        sender: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
        },
        pickUpAddress: '123 Main St',
        pickUpCoordinates: [3.1319, 6.5244],
        deliveryLocations: [
          {
            address: '456 Oak Ave',
            coordinates: [3.1401, 6.5186],
            recipient: {
              name: 'Jane Smith',
              email: 'jane@example.com',
              phone: '0987654321',
            },
          },
          {
            address: '789 Pine Rd',
            coordinates: [3.1285, 6.5349],
            recipient: {
              name: 'Bob Johnson',
              email: 'bob@example.com',
              phone: '5555555555',
            },
          },
        ],
        userOrderRole: UserOrderRole.SENDER,
        noteForRider: 'Handle with care',
        isUrgent: false,
      };

      const mockChargeResult = {
        totalAmount: 2000,
        totalDeliveryFee: 1800,
        serviceCharge: 200,
        pickupLocation: [3.1319, 6.5244] as [number, number],
        deliveries: [
          {
            deliveryLocation: [3.1401, 6.5186] as [number, number],
            distance_from_pickup_km: 2.3,
            duration_from_pickup: '8 minutes',
            deliveryFee: 460,
          },
          {
            deliveryLocation: [3.1285, 6.5349] as [number, number],
            distance_from_pickup_km: 4.1,
            duration_from_pickup: '12 minutes',
            deliveryFee: 820,
          },
        ],
        totalDistanceKm: 6.4,
        estimatedTotalDuration: '20 minutes',
        vehicleType: VehicleType.BIKE,
      };

      calculateDeliveryChargesUsecase.calculateMultipleDeliveryFee.mockResolvedValue(
        mockChargeResult,
      );

      walletService.getUserWallet.mockResolvedValue({
        id: 'wallet-123',
        walletBalance: 5000,
        createdAt: new Date(),
        isFrozen: false,
        customerCode: 'CUST123',
      });

      const mockOrderRepo = {
        save: jest.fn().mockResolvedValue({ id: 'order-123' }),
      };
      const mockWalletRepo = {
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 'wallet-123', walletBalance: 5000 }),
        save: jest.fn(),
      };
      const mockTrackingRepo = {
        save: jest.fn(),
      };
      const mockDestinationRepo = {
        save: jest.fn(),
      };

      const queryRunner = dataSource.createQueryRunner();
      (queryRunner.manager.getRepository as jest.Mock).mockImplementation(
        (entity: any) => {
          if (entity === Order) return mockOrderRepo;
          if (entity.name === 'Wallets') return mockWalletRepo;
          if (entity === OrderTracking) return mockTrackingRepo;
          if (entity === DeliveryDestination) return mockDestinationRepo;
          return {};
        },
      );

      const result = await usecase.createMultipleDeliveryOrder(userId, dto);

      expect(
        calculateDeliveryChargesUsecase.calculateMultipleDeliveryFee,
      ).toHaveBeenCalledWith(
        [3.1319, 6.5244],
        [
          [3.1401, 6.5186],
          [3.1285, 6.5349],
        ],
        false,
        500,
      );

      expect(walletService.getUserWallet).toHaveBeenCalledWith(userId);
      expect(mockDestinationRepo.save).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Multiple delivery order created successfully',
      );
    });

    it('should throw error when insufficient balance', async () => {
      const userId = 'user-123';
      const dto: CreateMultipleDeliveryOrderDto = {
        sender: {
          name: 'John Doe',
          phone: '1234567890',
        },
        pickUpAddress: '123 Main St',
        pickUpCoordinates: [3.1319, 6.5244],
        deliveryLocations: [
          {
            address: '456 Oak Ave',
            coordinates: [3.1401, 6.5186],
            recipient: {
              name: 'Jane Smith',
              phone: '0987654321',
            },
          },
        ],
        userOrderRole: UserOrderRole.SENDER,
      };

      const mockChargeResult = {
        totalAmount: 5000,
        totalDeliveryFee: 4500,
        serviceCharge: 500,
        pickupLocation: [3.1319, 6.5244] as [number, number],
        deliveries: [
          {
            deliveryLocation: [3.1401, 6.5186] as [number, number],
            distance_from_pickup_km: 2.3,
            duration_from_pickup: '8 minutes',
            deliveryFee: 4500,
          },
        ],
        totalDistanceKm: 2.3,
        estimatedTotalDuration: '8 minutes',
        vehicleType: VehicleType.BIKE,
      };

      calculateDeliveryChargesUsecase.calculateMultipleDeliveryFee.mockResolvedValue(
        mockChargeResult,
      );

      walletService.getUserWallet.mockResolvedValue({
        id: 'wallet-123',
        walletBalance: 1000, // Insufficient balance
        createdAt: new Date(),
        isFrozen: false,
        customerCode: 'CUST123',
      });

      await expect(
        usecase.createMultipleDeliveryOrder(userId, dto),
      ).rejects.toThrow('insufficient balance');
    });
  });
});
