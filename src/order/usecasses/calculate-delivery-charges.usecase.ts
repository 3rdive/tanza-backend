import { Injectable } from '@nestjs/common';
import { DeliveryFeeResult } from '../dto/delivery-fee-result.dto';
import {
  MultipleDeliveryFeeResult,
  SingleDeliveryLeg,
} from '../dto/multiple-delivery-fee-result.dto';
import { LocationService } from '../../location/location.service';
import { ConfigService } from '@nestjs/config';
import { NumberUtil } from '../../commons/number.util';
import { VehicleType } from '../entities/vehicle-type.enum';

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
    const { distanceKm, durationHuman } =
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
      distanceKm,
      distanceKm > 5 ? vanChargePerKM : bikeChargePerKM,
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
      duration: durationHuman,
      distanceInKm: distanceKm,
    };
  }

  async calculateMultipleDeliveryFee(
    pickupLocation: [number, number], // [lon, lat]
    deliveryLocations: [number, number][], // Array of [lon, lat]
    isUrgent: boolean = false,
    urgencyFee: number,
  ): Promise<MultipleDeliveryFeeResult> {
    if (!deliveryLocations || deliveryLocations.length === 0) {
      throw new Error('At least one delivery location is required');
    }

    // Rates: rider (bike) and driver (van). Bicycle-specific rate is not used for vehicle selection.
    const bikeChargePerKM = this.configService.get<number>(
      'RIDER_RATE_PER_KM',
      200,
    );

    const vanChargePerKM = this.configService.get<number>(
      'DRIVER_RATE_PER_KM',
      300,
    );

    const serviceChargepercent = this.configService.get<number>(
      'SERVICE_CHARGE_PERCENT',
      0,
    );

    const deliveries: SingleDeliveryLeg[] = [];
    let totalDistanceKm = 0;
    let totalDeliveryFee = 0;
    let maxDistanceFromPickup = 0;

    const deliveryDistances: Array<{
      location: [number, number];
      distance_in_km: number;
      duration_in_words: string;
    }> = [];

    // First pass: calculate all distances and find maximum
    for (const deliveryLocation of deliveryLocations) {
      const { distanceKm, durationHuman } =
        await this.locationService.calculateDistance(
          pickupLocation,
          deliveryLocation,
        );

      deliveryDistances.push({
        location: deliveryLocation,
        distance_in_km: distanceKm,
        duration_in_words: durationHuman,
      });

      // Track the maximum distance to determine vehicle type
      maxDistanceFromPickup = Math.max(maxDistanceFromPickup, distanceKm);
    }

    // Determine vehicle type based on maximum distance.
    // If any delivery is > 5km, use van (driver) rate; otherwise use rider (bike) rate.
    const chargePerKM =
      maxDistanceFromPickup > 5 ? vanChargePerKM : bikeChargePerKM;

    // Second pass: calculate fees using the determined rate
    for (const deliveryData of deliveryDistances) {
      const deliveryFee = NumberUtil.multiply(
        deliveryData.distance_in_km,
        chargePerKM,
      );

      deliveries.push({
        deliveryLocation: deliveryData.location,
        distance_from_pickup_km: deliveryData.distance_in_km,
        duration_from_pickup: deliveryData.duration_in_words,
        deliveryFee,
      });

      totalDistanceKm = NumberUtil.add(
        totalDistanceKm,
        deliveryData.distance_in_km,
      );
      totalDeliveryFee = NumberUtil.add(totalDeliveryFee, deliveryFee);
    }

    // Add urgent fee if order is urgent (applied to total delivery fee)
    if (isUrgent) {
      totalDeliveryFee = NumberUtil.add(totalDeliveryFee, urgencyFee);
    }

    const serviceChargeAmount = NumberUtil.multiply(
      totalDeliveryFee,
      serviceChargepercent,
    );
    const totalAmount = NumberUtil.add(serviceChargeAmount, totalDeliveryFee);

    // Estimate total duration (this is a simplified calculation)
    // In reality, you might want to calculate the optimal route
    const estimatedTotalDuration = `${Math.ceil(totalDistanceKm * 3)} minutes`; // Rough estimate: 3 minutes per km

    return {
      totalAmount,
      totalDeliveryFee,
      serviceCharge: serviceChargeAmount,
      pickupLocation,
      deliveries,
      totalDistanceKm,
      estimatedTotalDuration,
      vehicleType:
        maxDistanceFromPickup > 5 ? VehicleType.VAN : VehicleType.BIKE,
    };
  }
}
