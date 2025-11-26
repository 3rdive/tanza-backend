import { OrderLocation } from './order-location';
import { UserInfo } from '../entities/user-info';

export class AssignedOrderDto {
  id: string;
  userId: string;
  userFullName: string;
  userMobileNumber: string;
  profilePicUrl: string;
  pickUpLocation: OrderLocation;
  dropOffLocation: OrderLocation;
  eta: string;
  distanceInKm: number;
  isUrgent: boolean;
  amount: number;

  // Multiple delivery support
  hasMultipleDeliveries?: boolean;
  deliveryDestinations?: {
    id: string;
    dropOffLocation: OrderLocation;
    recipient: UserInfo;
    distanceFromPickupKm: number;
    durationFromPickup: string;
    deliveryFee: number;
    delivered: boolean;
    deliveredAt?: Date;
    createdAt: Date;
  }[];
}
