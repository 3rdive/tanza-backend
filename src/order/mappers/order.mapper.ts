import { UserInfo } from '../../users/entities/user-info';
import { ActiveOrder } from '../dto/active-order.dto';
import { AssignedOrderDto } from '../dto/assigned-order.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderPreview } from '../dto/order-preview';
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
    distanceInKm: number,
    isUrgent: boolean = false,
  ): Order {
    const order = new Order();

    order.sender = this.mapToUserInfo(dto.sender, dto.userOrderRole) as any;
    order.recipient = this.mapToUserInfo(
      dto.recipient,
      dto.userOrderRole === UserOrderRole.SENDER
        ? UserOrderRole.RECIPIENT
        : UserOrderRole.SENDER,
    ) as any;

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
    order.distanceInKm = distanceInKm;
    order.isUrgent = isUrgent;

    return order;
  }

  private static mapToUserInfo(
    partyInfo: { name: string; email?: string; phone: string },
    role: UserOrderRole,
  ): UserInfo | null {
    if (!partyInfo) return null;
    return {
      ...partyInfo,
      email: partyInfo.email || '',
      role,
    };
  }

  static mapOrderToPreview(order: Order): OrderPreview {
    return new OrderPreview(
      order.id,
      order?.orderTracking?.[0]?.status,
      order.pickUpLocation.address,
      order.dropOffLocation.address,
      order.userOrderRole,
      order.deliveryFee,
      order.updatedAt,
      order.eta,
      order.hasRewardedRider,
    );
  }

  static mapOrdersToPreviews(orders: Order[]): OrderPreview[] {
    return orders.map((order) => this.mapOrderToPreview(order));
  }

  static mapToActiveOrder(order: Order): ActiveOrder {
    return {
      orderId: order.id,
      userId: order.userId,
      note: order.noteForRider,
      amount: order.deliveryFee,
      userFullName:
        (order.user
          ? `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim()
          : '') ||
        order.sender?.name ||
        order.recipient?.name ||
        '',
      userMobileNumber:
        order.user?.mobile ||
        order.sender?.phone ||
        order.recipient?.phone ||
        '',
      profilePicUrl: order.user?.profilePic || '',
      pickUpLocation: order.pickUpLocation,
      dropOffLocation: order.dropOffLocation,
      orderTracking:
        order.orderTracking
          ?.slice()
          .sort((a, b) =>
            a.createdAt && b.createdAt
              ? new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
              : 0,
          )
          .map((tracking) => ({
            id: tracking.id,
            status: tracking.status,
            createdAt: tracking.createdAt,
          })) || [],
    };
  }

  static mapToActiveOrders(orders: Order[]): ActiveOrder[] {
    return orders.map((order) => this.mapToActiveOrder(order));
  }

  static mapToAssignedOrder(order: Order): AssignedOrderDto {
    return {
      id: order.id,
      userId: order.userId,
      userFullName:
        (order.user
          ? `${order.user.firstName ?? ''} ${order.user.lastName ?? ''}`.trim()
          : '') ||
        order.sender?.name ||
        order.recipient?.name ||
        '',
      userMobileNumber:
        order.user?.mobile ||
        order.sender?.phone ||
        order.recipient?.phone ||
        '',
      profilePicUrl: order.user?.profilePic || '',
      pickUpLocation: order.pickUpLocation,
      dropOffLocation: order.dropOffLocation,
      eta: order.eta,
      distanceInKm: order.distanceInKm || 0,
      isUrgent: order.isUrgent || false,
      amount: order.totalAmount,
    };
  }

  static mapToAssignedOrders(orders: Order[]): AssignedOrderDto[] {
    return orders.map((order) => this.mapToAssignedOrder(order));
  }
}
