import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CalculateDeliveryChargesUsecase } from './usecasses/calculate-delivery-charges.usecase';
import { CreateOrderUsecase } from './usecasses/create-order.usecase';
import { CalculateMultipleDeliveryFeeDto } from './dto/calculate-multiple-delivery-fee.dto';

describe('OrderController - Multiple Delivery Endpoint', () => {
  let controller: OrderController;
  let calculateDeliveryChargesUsecase: jest.Mocked<CalculateDeliveryChargesUsecase>;

  beforeEach(async () => {
    const mockCalculateDeliveryChargesUsecase = {
      calculateDeliveryFee: jest.fn(),
      calculateMultipleDeliveryFee: jest.fn(),
    };

    const mockCreateOrderUsecase = {
      createMultipleDeliveryOrder: jest.fn(),
    };

    const mockOrderService = {
      createOrder: jest.fn(),
      addOrderTracking: jest.fn(),
      removeOrderTracking: jest.fn(),
      getRiderOrders: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
        {
          provide: CalculateDeliveryChargesUsecase,
          useValue: mockCalculateDeliveryChargesUsecase,
        },
        {
          provide: CreateOrderUsecase,
          useValue: mockCreateOrderUsecase,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    calculateDeliveryChargesUsecase = module.get(
      CalculateDeliveryChargesUsecase,
    );
  });

  describe('POST /calculate-multiple-delivery-charge', () => {
    it('should call calculateMultipleDeliveryFee with correct parameters', async () => {
      const dto: CalculateMultipleDeliveryFeeDto = {
        pickupLocation: [3.1319, 6.5244],
        deliveryLocations: [
          [3.1401, 6.5186],
          [3.1285, 6.5349],
        ],
        isUrgent: true,
        urgencyFee: 500,
      };

      const expectedResult = {
        totalAmount: 2500,
        totalDeliveryFee: 2200,
        serviceCharge: 220,
        pickupLocation: [3.1319, 6.5244] as [number, number],
        deliveries: [],
        totalDistanceKm: 6.4,
        estimatedTotalDuration: '20 minutes',
        vehicleType: 'bike' as const,
      };

      calculateDeliveryChargesUsecase.calculateMultipleDeliveryFee.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.calculateMultipleDeliveryCharge(dto);

      expect(
        calculateDeliveryChargesUsecase.calculateMultipleDeliveryFee,
      ).toHaveBeenCalledWith(
        [3.1319, 6.5244], // pickupLocation
        [
          [3.1401, 6.5186],
          [3.1285, 6.5349],
        ], // deliveryLocations
        true, // isUrgent
        500, // urgencyFee
      );

      expect(result).toEqual(expectedResult);
    });

    it('should handle optional isUrgent parameter (defaults to false)', async () => {
      const dto: CalculateMultipleDeliveryFeeDto = {
        pickupLocation: [3.1319, 6.5244],
        deliveryLocations: [[3.1401, 6.5186]],
        urgencyFee: 0,
        // isUrgent is optional and not provided
      };

      const expectedResult = {
        totalAmount: 1100,
        totalDeliveryFee: 1000,
        serviceCharge: 100,
        pickupLocation: [3.1319, 6.5244] as [number, number],
        deliveries: [],
        totalDistanceKm: 3.2,
        estimatedTotalDuration: '10 minutes',
        vehicleType: 'bike' as const,
      };

      calculateDeliveryChargesUsecase.calculateMultipleDeliveryFee.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.calculateMultipleDeliveryCharge(dto);

      expect(
        calculateDeliveryChargesUsecase.calculateMultipleDeliveryFee,
      ).toHaveBeenCalledWith(
        [3.1319, 6.5244],
        [[3.1401, 6.5186]],
        false, // Should default to false when not provided
        0,
      );

      expect(result).toEqual(expectedResult);
    });
  });
});
