import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CalculateDeliveryChargesUsecase } from './calculate-delivery-charges.usecase';
import { LocationService } from '../../location/location.service';
import { VehicleType } from '../entities/vehicle-type.enum';

describe('CalculateDeliveryChargesUsecase - Multiple Delivery', () => {
  let usecase: CalculateDeliveryChargesUsecase;
  let locationService: jest.Mocked<LocationService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockLocationService = {
      calculateDistance: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalculateDeliveryChargesUsecase,
        {
          provide: LocationService,
          useValue: mockLocationService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    usecase = module.get<CalculateDeliveryChargesUsecase>(
      CalculateDeliveryChargesUsecase,
    );
    locationService = module.get(LocationService);
    configService = module.get(ConfigService);
  });

  describe('calculateMultipleDeliveryFee', () => {
    beforeEach(() => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          switch (key) {
            case 'RIDER_RATE_PER_KM':
              return 200;
            case 'DRIVER_RATE_PER_KM':
              return 300;
            case 'SERVICE_CHARGE_PERCENT':
              return 0.1; // 10%
            default:
              return defaultValue;
          }
        },
      );
    });

    it('should calculate fees for multiple deliveries using bike rate', async () => {
      const pickupLocation: [number, number] = [3.1319, 6.5244];
      const deliveryLocations: [number, number][] = [
        [3.1401, 6.5186], // 2.3km
        [3.1285, 6.5349], // 4.1km
      ];

      // Mock distance calculations
      locationService.calculateDistance
        .mockResolvedValueOnce({
          distanceKm: 2.3,
          durationHuman: '8 minutes',
          distanceMeters: 2300,
          durationSeconds: 480,
          mode: 'cycling-regular',
        })
        .mockResolvedValueOnce({
          distanceKm: 4.1,
          durationHuman: '12 minutes',
          distanceMeters: 4100,
          durationSeconds: 720,
          mode: 'cycling-regular',
        });

      const result = await usecase.calculateMultipleDeliveryFee(
        pickupLocation,
        deliveryLocations,
        false,
        0,
      );

      expect(result.totalAmount).toBeCloseTo(1408, 0);
      expect(result.totalDeliveryFee).toBeCloseTo(1280, 0);
      expect(result.serviceCharge).toBeCloseTo(128, 0);
      expect(result.pickupLocation).toEqual(pickupLocation);
      expect(result.totalDistanceKm).toBeCloseTo(6.4, 1);
      expect(result.estimatedTotalDuration).toBe('20 minutes');
      expect(result.vehicleType).toBe(VehicleType.BIKE);
      expect(result.deliveries).toHaveLength(2);
      expect(result.deliveries[0].deliveryFee).toBeCloseTo(460, 0);
      expect(result.deliveries[1].deliveryFee).toBeCloseTo(820, 0);
    });

    it('should use van rate when max distance > 5km', async () => {
      const pickupLocation: [number, number] = [3.1319, 6.5244];
      const deliveryLocations: [number, number][] = [
        [3.1401, 6.5186], // 2.3km
        [3.1456, 6.5123], // 5.8km (> 5km threshold)
      ];

      locationService.calculateDistance
        .mockResolvedValueOnce({
          distanceKm: 2.3,
          durationHuman: '8 minutes',
          distanceMeters: 2300,
          durationSeconds: 480,
          mode: 'cycling-regular',
        })
        .mockResolvedValueOnce({
          distanceKm: 5.8,
          durationHuman: '18 minutes',
          distanceMeters: 5800,
          durationSeconds: 1080,
          mode: 'cycling-regular',
        });

      const result = await usecase.calculateMultipleDeliveryFee(
        pickupLocation,
        deliveryLocations,
        false,
        0,
      );

      expect(result.vehicleType).toBe(VehicleType.VAN);
      expect(result.totalDeliveryFee).toBe(2430); // (2.3 * 300) + (5.8 * 300)
      expect(result.deliveries[0].deliveryFee).toBe(690); // 2.3 * 300 (van rate)
      expect(result.deliveries[1].deliveryFee).toBe(1740); // 5.8 * 300 (van rate)
    });

    it('should add urgency fee when isUrgent is true', async () => {
      const pickupLocation: [number, number] = [3.1319, 6.5244];
      const deliveryLocations: [number, number][] = [[3.1401, 6.5186]];

      locationService.calculateDistance.mockResolvedValueOnce({
        distanceKm: 2.3,
        durationHuman: '8 minutes',
        distanceMeters: 2300,
        durationSeconds: 480,
        mode: 'cycling-regular',
      });

      const result = await usecase.calculateMultipleDeliveryFee(
        pickupLocation,
        deliveryLocations,
        true, // urgent
        1000, // urgency fee
      );

      expect(result.totalDeliveryFee).toBe(1460); // 460 + 1000 (urgency fee)
      expect(result.serviceCharge).toBe(146); // 10% of 1460
      expect(result.totalAmount).toBe(1606); // 1460 + 146
    });

    it('should throw error when no delivery locations provided', async () => {
      const pickupLocation: [number, number] = [3.1319, 6.5244];
      const deliveryLocations: [number, number][] = [];

      await expect(
        usecase.calculateMultipleDeliveryFee(
          pickupLocation,
          deliveryLocations,
          false,
          0,
        ),
      ).rejects.toThrow('At least one delivery location is required');
    });
  });
});
