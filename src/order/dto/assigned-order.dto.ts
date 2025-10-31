import { OrderLocation } from './order-location';

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
}
