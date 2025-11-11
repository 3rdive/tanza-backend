import { Injectable } from '@nestjs/common';
import { DeliveryFeeResult } from '../dto/delivery-fee-result.dto';
import { LocationService } from 'src/location/location.service';
import { ConfigService } from '@nestjs/config';
import { NumberUtil } from 'src/commons/number.util';

@Injectable()
export class CalculateDeliveryChargesUsecase {
  constructor(
    private readonly locationService: LocationService,
    private readonly configService: ConfigService,
  ) {}

  async calculateDeliveryFee(
    start: [number, number], // [lon, lat]
    end: [number, number],
    isUrgent: boolean = false,
    urgencyFee: number,
  ): Promise<DeliveryFeeResult> {
    const { distance_in_km, duration_in_words } =
      await this.locationService.calculateDistance(start, end);

    const bikeChargePerKM = this.configService.get<number>(
      'RIDER_RATE_PER_KM',
      200,
    );

    const vanChargePerKM = this.configService.get<number>(
      'DRIVER_RATE_PER_KM',
      200,
    );
    const serviceChargepercent = this.configService.get<number>(
      'SERVICE_CHARGE_PERCENT',
      0,
    );
    // Distance already calculated via map API above

    let deliveryFee = NumberUtil.multiply(
      distance_in_km,
      distance_in_km > 5 ? vanChargePerKM : bikeChargePerKM,
    );

    // Add urgent fee if order is urgent
    if (isUrgent) {
      deliveryFee = NumberUtil.add(deliveryFee, urgencyFee);
    }

    const serviceChargeAmount = NumberUtil.multiply(
      deliveryFee,
      serviceChargepercent,
    );
    const totalAmount = NumberUtil.add(serviceChargeAmount, deliveryFee);

    return {
      totalAmount: totalAmount,
      deliveryFee: deliveryFee,
      serviceCharge: serviceChargeAmount,
      duration: duration_in_words,
      distanceInKm: distance_in_km,
    };
  }
}
