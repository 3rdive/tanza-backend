import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateOrderUsecase } from '../usecasses/create-order.usecase';
import { CalculateDeliveryChargesUsecase } from '../usecasses/calculate-delivery-charges.usecase';
import { WalletService } from '../../wallet/services/wallet.service';
import { Order } from '../entities/order.entity';
import { OrderTracking } from '../entities/order-tracking.entity';
import { DeliveryDestination } from '../entities/delivery-destination.entity';
import { CreateMultipleDeliveryOrderDto } from '../dto/create-multiple-delivery-order.dto';
import { UserOrderRole } from '../entities/user-order-role.enum';
import { VehicleType } from '../entities/vehicle-type.enum';
import { RiderService } from '../../users/services/rider.service';

describe('CreateOrderUsecase - Additional prioritized tests', () => {
  let usecase: CreateOrderUsecase;
  let calculateDeliveryChargesUsecase: jest.Mocked<CalculateDeliveryChargesUsecase>;
  let walletService: jest.Mocked<WalletService>;
  let dataSource: jest.Mocked<DataSource>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const mockCalculateDeliveryChargesUsecase = {
      calculateMultipleDeliveryFee: jest.fn(),
    } as any;

    const mockWalletService = {
      getUserWallet: jest.fn(),
    } as any;

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
    } as any;

    mockEventBus = {
      publish: jest.fn(),
    } as any;

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  const sampleDto: CreateMultipleDeliveryOrderDto = {
    sender: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '0800000000',
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

  it('happy path: should create multiple delivery order and commit transaction', async () => {
    const userId = 'user-abc';

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
      id: 'wallet-1',
      walletBalance: 5000,
      createdAt: new Date(),
      isFrozen: false,
      customerCode: 'CUST1',
    } as any);

    // Prepare repositories used by the query runner manager
    const mockOrderRepo = {
      save: jest.fn().mockResolvedValue({ id: 'order-xyz' }),
    };
    const mockWalletRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'wallet-1', walletBalance: 5000 }),
      save: jest.fn().mockResolvedValue(true),
    };
    const mockTrackingRepo = {
      save: jest.fn().mockResolvedValue({ id: 'tracking-1' }),
    };
    const mockDestinationRepo = {
      save: jest.fn().mockResolvedValue({ id: 'dest-1' }),
    };

    const queryRunner = dataSource.createQueryRunner();
    // route each entity to the corresponding mock repo
    (queryRunner.manager.getRepository as jest.Mock).mockImplementation(
      (entity: any) => {
        if (entity === Order) return mockOrderRepo;
        if (entity.name === 'Wallets') return mockWalletRepo;
        if (entity === OrderTracking) return mockTrackingRepo;
        if (entity === DeliveryDestination) return mockDestinationRepo;
        return {};
      },
    );

    const result = await usecase.createMultipleDeliveryOrder(userId, sampleDto);

    // verify calculation and wallet checks were called
    expect(
      calculateDeliveryChargesUsecase.calculateMultipleDeliveryFee,
    ).toHaveBeenCalled();
    expect(walletService.getUserWallet).toHaveBeenCalledWith(userId);

    // verify transaction flow on query runner
    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();

    // verify destination creation
    expect(mockDestinationRepo.save).toHaveBeenCalledTimes(
      sampleDto.deliveryLocations.length,
    );

    // result should indicate success
    expect(result.success).toBe(true);
    expect(result.message).toMatch(
      /Multiple delivery order created successfully/i,
    );
  });

  it('should throw insufficient balance when wallet balance is too low', async () => {
    const userId = 'user-lowbal';

    const mockChargeResult = {
      totalAmount: 3000,
      totalDeliveryFee: 2700,
      serviceCharge: 300,
      pickupLocation: [3.1319, 6.5244] as [number, number],
      deliveries: [
        {
          deliveryLocation: [3.1401, 6.5186] as [number, number],
          distance_from_pickup_km: 2.3,
          duration_from_pickup: '8 minutes',
          deliveryFee: 2700,
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
      id: 'wallet-low',
      walletBalance: 1000, // insufficient
      createdAt: new Date(),
      isFrozen: false,
      customerCode: 'CUSTLOW',
    } as any);

    await expect(
      usecase.createMultipleDeliveryOrder(userId, {
        ...sampleDto,
        deliveryLocations: [
          {
            address: 'Single',
            coordinates: [3.1401, 6.5186],
            recipient: { name: 'A', phone: '090' },
          },
        ],
      } as any),
    ).rejects.toThrow('insufficient balance');
  });

  it('should rollback transaction when repository save throws an error', async () => {
    const userId = 'user-rollback';

    const mockChargeResult = {
      totalAmount: 1500,
      totalDeliveryFee: 1300,
      serviceCharge: 200,
      pickupLocation: [3.1319, 6.5244] as [number, number],
      deliveries: [
        {
          deliveryLocation: [3.1401, 6.5186] as [number, number],
          distance_from_pickup_km: 2.3,
          duration_from_pickup: '8 minutes',
          deliveryFee: 1300,
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
      id: 'wallet-rollback',
      walletBalance: 5000,
      createdAt: new Date(),
      isFrozen: false,
      customerCode: 'CUSTRB',
    } as any);

    // Make orderRepo.save throw to simulate DB error
    const mockOrderRepo = {
      save: jest.fn().mockRejectedValue(new Error('DB save failed')),
    };
    const mockWalletRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'wallet-rollback', walletBalance: 5000 }),
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

    await expect(
      usecase.createMultipleDeliveryOrder(userId, {
        ...sampleDto,
        deliveryLocations: [
          {
            address: 'Err',
            coordinates: [3.1401, 6.5186],
            recipient: { name: 'Err', phone: '090' },
          },
        ],
      } as any),
    ).rejects.toThrow('DB save failed');

    // Ensure rollback occurred and transaction was released
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });
});
