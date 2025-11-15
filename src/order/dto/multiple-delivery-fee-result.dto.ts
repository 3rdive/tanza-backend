import { VehicleType } from '../entities/vehicle-type.enum';

export interface SingleDeliveryLeg {
  deliveryLocation: [number, number]; // [lon, lat]
  distance_from_pickup_km: number;
  duration_from_pickup: string;
  deliveryFee: number;
}

export interface MultipleDeliveryFeeResult {
  totalAmount: number;
  totalDeliveryFee: number;
  serviceCharge: number;
  pickupLocation: [number, number]; // [lon, lat]
  deliveries: SingleDeliveryLeg[];
  totalDistanceKm: number;
  estimatedTotalDuration: string;
  vehicleType: VehicleType;
}
