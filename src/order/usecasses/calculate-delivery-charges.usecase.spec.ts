import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CalculateDeliveryChargesUsecase } from './calculate-delivery-charges.usecase';
import { LocationService } from '../../location/location.service';

describe('CalculateDeliveryChargesUsecase - Single Delivery', () => {
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

  describe('calculateDeliveryFee', () => {
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

    it('should calculate delivery fee for short distance (bike)', async () => {
      const start: [number, number] = [3.1319, 6.5244];
      const end: [number, number] = [3.1401, 6.5186];

      locationService.calculateDistance.mockResolvedValueOnce({
        distance_in_km: 3.2,
        duration_in_words: '10 minutes',
        distance_meters: 3200,
        duration_seconds: 600,
      });

      const result = await usecase.calculateDeliveryFee(start, end, false, 0);

      expect(result.distanceInKm).toBe(3.2);
      expect(result.deliveryFee).toBeCloseTo(640, 0); // 3.2 * 200
      expect(result.serviceCharge).toBeCloseTo(64, 0); // 10% of 640
      expect(result.totalAmount).toBeCloseTo(704, 0); // 640 + 64
      expect(result.duration).toBe('10 minutes');
    });

    it('should calculate delivery fee for long distance (van)', async () => {
      const start: [number, number] = [3.1319, 6.5244];
      const end: [number, number] = [3.1401, 6.5186];

      locationService.calculateDistance.mockResolvedValueOnce({
        distance_in_km: 7.5,
        duration_in_words: '22 minutes',
        distance_meters: 7500,
        duration_seconds: 1320,
      });

      const result = await usecase.calculateDeliveryFee(start, end, false, 0);

      expect(result.distanceInKm).toBe(7.5);
      expect(result.deliveryFee).toBeCloseTo(2250, 0); // 7.5 * 300 (van rate)
      expect(result.serviceCharge).toBeCloseTo(225, 0); // 10% of 2250
      expect(result.totalAmount).toBeCloseTo(2475, 0); // 2250 + 225
    });

    it('should add urgency fee when urgent', async () => {
      const start: [number, number] = [3.1319, 6.5244];
      const end: [number, number] = [3.1401, 6.5186];

      locationService.calculateDistance.mockResolvedValueOnce({
        distance_in_km: 3.2,
        duration_in_words: '10 minutes',
        distance_meters: 3200,
        duration_seconds: 600,
      });

      const result = await usecase.calculateDeliveryFee(start, end, true, 500);

      expect(result.deliveryFee).toBeCloseTo(1140, 0); // (3.2 * 200) + 500
      expect(result.serviceCharge).toBeCloseTo(114, 0); // 10% of 1140
      expect(result.totalAmount).toBeCloseTo(1254, 0); // 1140 + 114
    });
  });
});
