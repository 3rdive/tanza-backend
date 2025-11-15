import { TrackingStatus } from '../entities/tracking-status.enum';
import { UserInfo } from '../entities/user-info';
import { OrderLocation } from './order-location';

export class ActiveOrder {
  orderId: string;
  userId: string;
  userFullName: string;
  sender?: UserInfo;
  recipient?: UserInfo;
  userMobileNumber: string;
  profilePicUrl: string;
  pickUpLocation: OrderLocation;
  dropOffLocation: OrderLocation;
  orderTracking: OrderTrackingDto[];
  note: string;
  amount: number;
  eta: string | null;
  createdAt: Date;
}

export class OrderTrackingDto {
  id: string;
  status: TrackingStatus;
  createdAt: Date;
}
