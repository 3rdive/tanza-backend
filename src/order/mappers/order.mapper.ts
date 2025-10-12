import { UserInfo } from '../../users/entities/user-info';
import { CreateOrderDto } from '../dto/create-order.dto';
import { Order } from '../entities/order.entity';
import { UserOrderRole } from '../entities/user-order-role.enum';

export class OrderMapper {
  public static toEntity(
    dto: CreateOrderDto,
    userId: string,
    start: [number, number],
    end: [number, number],
    serviceCharge: number,
    duration: string,
    totalAmount: number,
    deliveryFee: number,
  ): Order {
    const order = new Order();

    order.sender = this.mapToUserInfo(dto.sender, dto.userOrderRole);
    order.recipient = this.mapToUserInfo(
      dto.recipient,
      dto.userOrderRole === UserOrderRole.SENDER
        ? UserOrderRole.RECIPIENT
        : UserOrderRole.SENDER,
    );

    order.userId = userId;
    order.pickUpLocation = {
      longitude: String(start[0]),
      latitude: String(start[1]),
      address: dto.pickUpLocation,
    };

    order.dropOffLocation = {
      longitude: String(end[0]),
      latitude: String(end[1]),
      address: dto.dropOffLocation,
    };

    order.userOrderRole = dto.userOrderRole;
    order.vehicleType = dto.vehicleType;
    order.noteForRider = dto.noteForRider || '';
    order.serviceChargeAmount = serviceCharge || 0;
    order.eta = duration || 'N/A';
    order.totalAmount = totalAmount;
    order.deliveryFee = deliveryFee;

    return order;
  }

  private static mapToUserInfo(
    partyInfo: { name: string; email?: string; phone: string },
    role: UserOrderRole,
  ): UserInfo {
    return {
      ...partyInfo,
      email: partyInfo.email || '',
      role,
    };
  }
}
