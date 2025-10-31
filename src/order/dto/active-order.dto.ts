import { TrackingStatus } from '../entities/tracking-status.enum';
import { OrderLocation } from './order-location';

export class ActiveOrder {
  orderId: string;
  userId: string;
  userFullName: string;
  userMobileNumber: string;
  profilePicUrl: string;
  pickUpLocation: OrderLocation;
  dropOffLocation: OrderLocation;
  orderTracking: OrderTrackingDto[];
  note: string;
  amount: number;
}

export class OrderTrackingDto {
  id: string;
  status: TrackingStatus;
  createdAt: Date;
}
