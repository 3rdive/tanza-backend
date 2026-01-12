import { OrderLocation } from './order-location';
import { UserInfo } from '../entities/user-info';
import { UserOrderRole } from '../entities/user-order-role.enum';
import { OrderTracking } from '../entities/order-tracking.entity';
import { DeliveryDestination } from '../entities/delivery-destination.entity';

export class OrderDetailsDto {
  id: string;
  sender: UserInfo;
  recipient: UserInfo;
  pickUpLocation: OrderLocation;
  dropOffLocation: OrderLocation;
  deliveryDestinations: DeliveryDestination[];
  hasMultipleDeliveries: boolean;
  userOrderRole: UserOrderRole;
  vehicleType: string | null;
  noteForRider: string;
  serviceChargeAmount: number;
  deliveryFee: number;
  totalAmount: number;
  eta: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  orderTracking: OrderTracking[];
  riderId: string;
  riderAssigned: boolean;
  riderAssignedAt: Date;
  hasRewardedRider: boolean;
  distanceInKm: number;
  isUrgent: boolean;
  isCashPayment: boolean;
  cashAmountToReceive: number;
}
