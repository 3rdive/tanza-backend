import { TrackingStatus } from '../entities/tracking-status.enum';
import { UserOrderRole } from '../entities/user-order-role.enum';

export class OrderPreview {
  constructor(
    public id: string,
    public status: TrackingStatus,
    public pickUpLocationAddress: string | null,
    public dropOffLocationAddress: string | null,
    public userOrderRole: UserOrderRole,
    public deliveryFee: number,
    public updatedAt: Date,
    public eta: string,
    public riderRewarded: boolean,
  ) {}
}
