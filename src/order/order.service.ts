import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
  DataSource,
  QueryRunner,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { PaginationService } from '../commons/pagination.service';
import { StandardResponse } from '../commons/standard-response';
import { RiderService } from '../users/services/rider.service';
import { OrderRiderPaginationDto } from '../wallet/dto/OrderRiderPaginationDto';
import { TransactionDto } from '../wallet/dto/transaction-dto';
import { TransactionStatus } from '../wallet/dto/transaction-status';
import { TransactionType } from '../wallet/entities/transaction-type.enum';
import { CreateTransactionEvent } from '../wallet/events/models/create-transaction.event';
import { WalletService } from '../wallet/services/wallet.service';
import { AssignedOrderDto } from './dto/assigned-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderTrackingDto } from './dto/order-tracking.dto';
import { OrderTracking } from './entities/order-tracking.entity';
import { Order } from './entities/order.entity';
import { Wallets } from '../wallet/entities/wallet.entity';
import { TrackingStatus } from './entities/tracking-status.enum';
import { OrderMapper } from './mappers/order.mapper';
import { OrderPreview } from './dto/order-preview';
import { OrderDetailsDto } from './dto/order-details.dto';
import { normalizeDateRange } from './order-functions';
import { CreateNotficationEvent } from '../notification/create-notification.event';
import { ActiveOrder } from './dto/active-order.dto';
import { RiderFeedbackDto } from './dto/rider-feedback.dto';
import { RiderGateway } from './riders.gateway';
import { CreateTaskEvent } from '../task/create-task.event';
import { TaskCategory } from '../task/task-category.enum';
import { CalculateDeliveryChargesUsecase } from './usecasses/calculate-delivery-charges.usecase';
import { SearchAddressBookDto } from './dto/search-address-book.dto';
import { UserInfo } from './entities/user-info';
import { DeliveryDestination } from './entities/delivery-destination.entity';
import { MarkDestinationDeliveredDto } from './dto/mark-destination-delivered.dto';
import { SendPushNotificationEvent } from '../notification/send-push-notification.event';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  // Reusable join snippet to get only the latest tracking per order
  private static readonly LATEST_TRACKING_JOIN_CLAUSE = `tracking.createdAt = (
       SELECT MAX(ot."createdAt")
       FROM order_tracking ot
       WHERE ot."orderId" = o.id
     )`;

  constructor(
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderTracking)
    private readonly orderTrackingRepository: Repository<OrderTracking>,
    @InjectRepository(DeliveryDestination)
    private readonly deliveryDestinationRepository: Repository<DeliveryDestination>,
    private readonly eventBus: EventBus,
    private readonly calculateDeliveryChargesUsecase: CalculateDeliveryChargesUsecase,
    private readonly riderService: RiderService,
    private readonly dataSource: DataSource,
    private readonly riderGateway: RiderGateway,
  ) {}

  // async createOrder(
  //   userId: string,
  //   dto: CreateOrderDto,
  //   start: [number, number], //[lon, lat]
  //   end: [number, number], // [lon, lat]
  //   isUrgent: boolean = false,
  //   urgencyFee: number,
  // ): Promise<StandardResponse<Order>> {
  //   // validateUserInfo(dto);

  //   const { duration, totalAmount, serviceCharge, deliveryFee, distanceInKm } =
  //     await this.calculateDeliveryChargesUsecase.calculateDeliveryFee(
  //       start,
  //       end,
  //       isUrgent,
  //       urgencyFee,
  //     );

  //   const walletDto = await this.walletService.getUserWallet(userId);
  //   if (totalAmount > walletDto.walletBalance) {
  //     throw new BadRequestException(
  //       StandardResponse.fail('insufficient balance'),
  //     );
  //   }

  //   const order = OrderMapper.toEntity(
  //     dto,
  //     userId,
  //     start,
  //     end,
  //     serviceCharge,
  //     duration,
  //     totalAmount,
  //     deliveryFee,
  //     distanceInKm,
  //     isUrgent,
  //   );

  //   const queryRunner = this.dataSource.createQueryRunner();
  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();

  //   try {
  //     const orderRepo = queryRunner.manager.getRepository(Order);
  //     const walletRepo = queryRunner.manager.getRepository(Wallets);
  //     const trackingRepo = queryRunner.manager.getRepository(OrderTracking);

  //     const saved = await orderRepo.save(order);

  //     const wallet = await walletRepo.findOne({ where: { userId } });
  //     if (!wallet) {
  //       throw new BadRequestException(
  //         StandardResponse.fail('wallet not found'),
  //       );
  //     }
  //     wallet.walletBalance -= totalAmount; // deduct
  //     await walletRepo.save(wallet);

  //     const orderTracking = new OrderTracking();
  //     orderTracking.orderId = saved.id;
  //     orderTracking.note = 'Order created';
  //     orderTracking.status = TrackingStatus.PENDING;
  //     await trackingRepo.save(orderTracking);

  //     await queryRunner.commitTransaction();

  //     const transactionDto = new TransactionDto();
  //     transactionDto.walletId = wallet.id;
  //     transactionDto.userId = userId;
  //     transactionDto.amount = totalAmount;
  //     transactionDto.type = TransactionType.ORDER;
  //     transactionDto.reference = `TZTX-${uuid()}`;
  //     transactionDto.status = TransactionStatus.COMPLETE;
  //     transactionDto.description = `Placed Order of N${totalAmount} for delivery.`;
  //     transactionDto.orderId = saved.id;
  //     this.eventBus.publish(new CreateTransactionEvent(transactionDto));

  //     await this.assignRiderToOrder(saved.id);
  //     return StandardResponse.ok(saved, 'Order created successfully');
  //   } catch (error) {
  //     this.logger.error(
  //       'Failed to create order',
  //       error?.stack || String(error),
  //     );
  //     await queryRunner.rollbackTransaction();
  //     throw error;
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }

  async assignRiderToOrder(
    orderId: string,
    riderId?: string, //optionally provide riderId
  ): Promise<StandardResponse<Order> | void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new BadRequestException(StandardResponse.fail('order not found'));
    }

    const excludedRiderIds = order.declinedRiderIds || [];

    // Extract pickup location coordinates
    const pickupLocation: [number, number] | undefined = order.pickUpLocation
      ? [
          parseFloat(order.pickUpLocation.longitude),
          parseFloat(order.pickUpLocation.latitude),
        ]
      : undefined;

    if (!riderId) {
      riderId = await this.riderService.getRiderForOrder(
        excludedRiderIds,
        pickupLocation,
      );
    }

    if (!riderId) {
      this.logger.warn('No available rider found for order assignment');
      return; // no rider available is not an error pathway
    }

    await this.assignRider(order, riderId);
    return StandardResponse.ok(order, 'Rider assigned successfully');
  }

  /**
   * Assign a rider to an order and send notification
   */
  private async assignRider(order: Order, riderId: string): Promise<void> {
    await this.orderRepository.update(order.id, {
      riderId: riderId,
      riderAssigned: true,
      riderAssignedAt: new Date(),
    });

    const updatedOrder = await this.orderRepository.findOne({
      where: { id: order.id },
      relations: ['deliveryDestinations', 'user'],
    });

    // Send push notification
    this.eventBus.publish(
      new CreateNotficationEvent(
        'New Order',
        `You have a new order delivery of N${order.deliveryFee ?? 0}`,
        riderId,
        `(tabs)/orders/${order.id}?tab=upcoming`,
      ),
    );

    // Send real-time WebSocket notification
    this.riderGateway.notifyRiderNewOrder(
      riderId,
      OrderMapper.mapToAssignedOrder(updatedOrder!),
    );
  }

  async findOne(id: string): Promise<OrderDetailsDto | null> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['orderTracking', 'deliveryDestinations', 'vehicleType'],
    });
    return order ? OrderMapper.toOrderDetailsDto(order) : null;
  }

  async addOrderTracking({
    orderId,
    note,
    status,
  }: OrderTrackingDto): Promise<OrderTracking> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepo = queryRunner.manager.getRepository(Order);
      const trackingRepo = queryRunner.manager.getRepository(OrderTracking);

      // Ensure the order exists
      const order = await orderRepo.findOne({
        where: { id: orderId },
        relations: ['deliveryDestinations'],
      });
      if (!order) {
        throw new BadRequestException(StandardResponse.fail('order not found'));
      }

      // If order has multiple deliveries and trying to mark as DELIVERED,
      // check if all destinations have been delivered
      if (
        status === TrackingStatus.DELIVERED &&
        order.hasMultipleDeliveries &&
        order.deliveryDestinations &&
        order.deliveryDestinations.length > 0
      ) {
        const allDestinationsDelivered = order.deliveryDestinations.every(
          (dest) => dest.delivered,
        );

        if (!allDestinationsDelivered) {
          const undeliveredCount = order.deliveryDestinations.filter(
            (dest) => !dest.delivered,
          ).length;
          throw new BadRequestException(
            StandardResponse.fail(
              `cannot mark order as delivered. ${undeliveredCount} delivery destination(s) have not been delivered yet`,
            ),
          );
        }
      }

      // Prevent duplicate tracking status for the same order
      const exists = await trackingRepo.findOne({
        where: { orderId, status },
      });
      if (exists) {
        throw new BadRequestException(
          StandardResponse.fail(
            'tracking with the same status already exists for this order',
          ),
        );
      }

      // Enforce sequential tracking transitions with optional TRANSIT and CANCELLED allowed anytime
      const latest = await trackingRepo.findOne({
        where: { orderId },
        order: { createdAt: 'DESC' },
      });

      // If already cancelled, no further transitions allowed
      if (latest?.status === TrackingStatus.CANCELLED) {
        throw new BadRequestException(
          StandardResponse.fail(
            'order already cancelled; no further updates allowed',
          ),
        );
      }

      if (
        latest?.status === TrackingStatus.DELIVERED &&
        status !== TrackingStatus.CANCELLED
      ) {
        throw new BadRequestException(
          StandardResponse.fail(
            'order already delivered; cannot update status',
          ),
        );
      }

      const transitions: Record<TrackingStatus, TrackingStatus[]> = {
        [TrackingStatus.PENDING]: [TrackingStatus.ACCEPTED],
        [TrackingStatus.ACCEPTED]: [TrackingStatus.PICKED_UP],
        [TrackingStatus.PICKED_UP]: [TrackingStatus.TRANSIT],
        [TrackingStatus.TRANSIT]: [TrackingStatus.DELIVERED],
        [TrackingStatus.DELIVERED]: [],
        [TrackingStatus.CANCELLED]: [],
      };

      let allowedNext: TrackingStatus[] = [];

      if (!latest) {
        // No tracking yet (edge case) — allow PENDING to kick off or CANCELLED to abort
        allowedNext = [TrackingStatus.PENDING, TrackingStatus.CANCELLED];
      } else {
        allowedNext = [...transitions[latest.status], TrackingStatus.CANCELLED];
      }

      if (!allowedNext.includes(status)) {
        throw new BadRequestException(
          StandardResponse.fail(
            `invalid status transition from ${latest?.status ?? 'none'} to ${status}`,
          ),
        );
      }

      const orderTracking = new OrderTracking();
      orderTracking.orderId = orderId;
      orderTracking.note = note;
      orderTracking.status = status;
      const savedTracking = await trackingRepo.save(orderTracking);

      if (status == TrackingStatus.DELIVERED) {
        await this.rewardRider(orderId, queryRunner);
      }

      await queryRunner.commitTransaction();
      return savedTracking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to add order tracking for ${orderId}`,
        error?.stack || String(error),
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async removeOrderTracking(trackingId: string): Promise<{ success: true }> {
    const tr = await this.orderTrackingRepository.findOne({
      where: { id: trackingId },
    });
    if (!tr) {
      throw new BadRequestException(
        StandardResponse.fail('order tracking not found'),
      );
    }
    await this.orderTrackingRepository.remove(tr);
    return { success: true };
  }

  // fetch order history for riders
  async getRiderOrders(
    riderId: string,
    orderRiderPaginationDto: OrderRiderPaginationDto,
  ): Promise<StandardResponse<any>> {
    const {
      limit = 10,
      page = 1,
      startDate,
      endDate,
      orderStatus,
    } = orderRiderPaginationDto;

    // Normalize orderStatus to an array to avoid string.includes pitfalls
    const statusArray = Array.isArray(orderStatus)
      ? orderStatus
      : orderStatus
        ? [orderStatus]
        : [];

    // Build where clause
    const where: any = { riderId };

    // Add date filtering if provided (use TypeORM operators, not raw objects)
    if (startDate || endDate) {
      // Normalize to start/end of day for inclusivity
      const { start, end } = normalizeDateRange(startDate, endDate);

      if (start && end) {
        where.createdAt = Between(start, end);
      } else if (start) {
        where.createdAt = MoreThanOrEqual(start);
      } else if (end) {
        where.createdAt = LessThanOrEqual(end);
      }
    }

    // If orderStatus is provided, we need to filter by the latest tracking status
    // This requires a more complex query since we need to join with orderTracking
    if (statusArray && statusArray.length > 0) {
      const queryBuilder = this.orderRepository
        .createQueryBuilder('o') // ✅ simple alias
        .leftJoinAndSelect(
          'o.orderTracking',
          'tracking',
          OrderService.LATEST_TRACKING_JOIN_CLAUSE,
        )
        .where('o.riderId = :riderId', { riderId });

      // Filter by latest tracking status
      if (statusArray.length > 0) {
        queryBuilder.andWhere('tracking.status IN (:...statusArray)', {
          statusArray,
        });
      }

      // Date filters
      const { start, end } = normalizeDateRange(startDate, endDate);
      if (start) {
        queryBuilder.andWhere('o.createdAt >= :startDate', {
          startDate: start,
        });
      }
      if (end) {
        queryBuilder.andWhere('o.createdAt <= :endDate', {
          endDate: end,
        });
      }

      // Pagination
      queryBuilder.skip((page - 1) * limit).take(limit);

      // Order
      queryBuilder.orderBy('o.createdAt', 'DESC');

      const [orders, total] = await queryBuilder.getManyAndCount();

      return StandardResponse.withPagination(
        OrderMapper.mapOrdersToPreviews(orders),
        'Rider orders fetched successfully',
        {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      );
    }

    // Use PaginationService for simple queries without status filtering
    const result = await PaginationService.findWithPagination({
      repository: this.orderRepository,
      paginationDto: { limit, page },
      where,
      orderBy: 'createdAt',
      orderDirection: 'DESC',
    });
    return StandardResponse.withPagination(
      OrderMapper.mapOrdersToPreviews(result.data),
      'Order [rider] fetched Successfully',
      result.pagination,
    );
  }

  // Pay rider upon successful delivery
  async rewardRider(
    orderId: string,
    existingQueryRunner?: QueryRunner,
  ): Promise<StandardResponse<string> | void> {
    const queryRunner =
      existingQueryRunner || this.dataSource.createQueryRunner();
    const shouldManageTransaction = !existingQueryRunner;

    if (shouldManageTransaction) {
      await queryRunner.connect();
      await queryRunner.startTransaction();
    }

    try {
      // Load order with latest tracking status
      const orderRepo = queryRunner.manager.getRepository(Order);
      const order = await orderRepo
        .createQueryBuilder('o')
        .leftJoinAndSelect(
          'o.orderTracking',
          'tracking',
          OrderService.LATEST_TRACKING_JOIN_CLAUSE,
        )
        .where('o.id = :orderId', { orderId })
        .getOne();

      if (!order) {
        throw new BadRequestException(StandardResponse.fail('order not found'));
      }

      if (!order.riderId) {
        throw new BadRequestException(
          StandardResponse.fail('rider not assigned to order'),
        );
      }

      const latestStatus = order.orderTracking?.[0]?.status;
      if (latestStatus !== TrackingStatus.DELIVERED) {
        throw new BadRequestException(
          StandardResponse.fail('order not completed'),
        );
      }

      if (order.hasRewardedRider) {
        throw new BadRequestException(
          StandardResponse.fail('rider already rewarded for this order'),
        );
      }

      const riderId = order.riderId;
      const walletRepo = queryRunner.manager.getRepository(Wallets);

      const ridersWallet = await walletRepo.findOne({
        where: { userId: riderId },
      });
      if (!ridersWallet) {
        throw new BadRequestException(
          StandardResponse.fail('wallet not found'),
        );
      }

      const deliveryFee = order.deliveryFee;
      ridersWallet.walletBalance = ridersWallet.walletBalance + deliveryFee;
      await walletRepo.save(ridersWallet);

      await orderRepo.update(order.id, { hasRewardedRider: true });

      const transactionDto = new TransactionDto();
      transactionDto.walletId = ridersWallet.id;
      transactionDto.userId = riderId;
      transactionDto.amount = deliveryFee;
      transactionDto.type = TransactionType.ORDER_REWARD;
      transactionDto.reference = `TZTX-${uuid()}`;
      transactionDto.status = TransactionStatus.COMPLETE;
      transactionDto.description = `Order Delivery Reward Order of N${deliveryFee?.toFixed(2)}.`;
      transactionDto.orderId = orderId;
      this.eventBus.publish(new CreateTransactionEvent(transactionDto));
      this.eventBus.publish(
        new CreateNotficationEvent(
          'Order Reward',
          `Your have been credited for your order completion`,
          riderId,
          `(tabs)/orders/${order.id}?tab=completed`,
        ),
      );

      this.eventBus.publish(
        new CreateTaskEvent(TaskCategory.REQUEST_REVIEW, riderId, order.userId),
      );
      this.eventBus.publish(
        new CreateTaskEvent(TaskCategory.REQUEST_REVIEW, order.userId, riderId),
      );

      if (shouldManageTransaction) {
        await queryRunner.commitTransaction();
        return StandardResponse.ok(
          'reward successful',
          'Rider rewarded successfully',
        );
      }
    } catch (error) {
      if (shouldManageTransaction) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.error(
        `Failed to reward rider for order ${orderId}`,
        error?.stack || String(error),
      );
      throw error;
    } finally {
      if (shouldManageTransaction) {
        await queryRunner.release();
      }
    }
  }

  //To get orders that are delivered but not yet paid/rewarded to rider
  async getCompletedUnrewardedOrdersForRider(
    userId: string,
  ): Promise<StandardResponse<OrderPreview[]>> {
    const orders = await this.orderRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect(
        'o.orderTracking',
        'tracking',
        OrderService.LATEST_TRACKING_JOIN_CLAUSE,
      )
      .where('o.riderId = :userId', { userId })
      .andWhere('o.hasRewardedRider = false')
      .andWhere('tracking.status = :delivered', {
        delivered: TrackingStatus.DELIVERED,
      })
      .orderBy('o.createdAt', 'DESC')
      .getMany();

    return StandardResponse.ok(
      OrderMapper.mapOrdersToPreviews(orders),
      'Completed unrewarded orders fetched successfully',
    );
  }

  async getActiveOrders(riderId: string): Promise<ActiveOrder[]> {
    const orders = await this.orderRepository
      .createQueryBuilder('o')
      // Join latestTracking (no select) just for filtering by latest status
      .leftJoin(
        'o.orderTracking',
        'tracking',
        OrderService.LATEST_TRACKING_JOIN_CLAUSE,
      )
      // Select all tracking entries for each order
      .leftJoinAndSelect('o.orderTracking', 'allTracking')
      .leftJoinAndSelect('o.deliveryDestinations', 'deliveryDestinations')
      // Also fetch the user who created the order
      .leftJoinAndSelect('o.user', 'user')
      .where('o.riderId = :riderId ', { riderId })
      .andWhere('tracking.status IN (:...statuses)', {
        statuses: [
          TrackingStatus.ACCEPTED,
          TrackingStatus.PICKED_UP,
          TrackingStatus.TRANSIT,
        ],
      })
      .orderBy('o.createdAt', 'DESC')
      .getMany();

    return OrderMapper.mapToActiveOrders(orders);
  }

  //get orders that has been assigned to a rider. but not accepted yet
  async getAssignedOrders(riderId: string): Promise<AssignedOrderDto[]> {
    const orders = await this.orderRepository
      .createQueryBuilder('o')
      // Join latestTracking (no select) just for filtering by latest status
      .leftJoin(
        'o.orderTracking',
        'tracking',
        OrderService.LATEST_TRACKING_JOIN_CLAUSE,
      )
      // Select all tracking entries for each order
      .leftJoinAndSelect('o.orderTracking', 'allTracking')
      .leftJoinAndSelect('o.deliveryDestinations', 'deliveryDestinations')
      // Also fetch the user who created the order
      .leftJoinAndSelect('o.user', 'user')
      .where('o.riderId = :riderId', { riderId })
      .andWhere('tracking.status IN (:...statuses)', {
        statuses: [TrackingStatus.PENDING],
      })
      .orderBy('o.createdAt', 'DESC')
      .getMany();

    return OrderMapper.mapToAssignedOrders(orders);
  }

  async handleRiderFeedback(
    riderId: string,
    dto: RiderFeedbackDto,
  ): Promise<StandardResponse<string>> {
    const { orderId, accepted } = dto;

    // Verify the order exists and is assigned to this rider
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException(StandardResponse.fail('order not found'));
    }

    if (order.riderId !== riderId) {
      throw new BadRequestException(
        StandardResponse.fail('order not assigned to this rider'),
      );
    }

    if (accepted) {
      await this.addOrderTracking({
        orderId: orderId,
        status: TrackingStatus.ACCEPTED,
        note: 'Rider accepted the order',
      });

      // Deduct service charge from rider's wallet for cash payments
      if (order.isCashPayment) {
        await this.deductServiceChargeFromRider(riderId, order);
      }

      return StandardResponse.ok(
        'Order accepted',
        'Order accepted successfully',
      );
    } else {
      // Handle decline
      await this.handleDecline(order, riderId);
      return StandardResponse.ok(
        'Order declined and reassigned',
        'Order declined and reassigned successfully',
      );
    }
  }

  /**
   * Deduct service charge from rider's wallet for cash payment orders.
   * Allows negative balance if rider doesn't have sufficient funds.
   */
  private async deductServiceChargeFromRider(
    riderId: string,
    order: Order,
  ): Promise<void> {
    try {
      // Get rider's wallet
      const riderWallet = await this.walletService.getUserWallet(riderId);

      // Deduct service charge from rider's wallet (allow negative balance)
      const serviceCharge = order.serviceChargeAmount;
      await this.walletService.deductServiceCharge(riderId, serviceCharge);

      // Create transaction record for service charge deduction
      const transactionDto = new TransactionDto();
      transactionDto.walletId = riderWallet.id;
      transactionDto.userId = riderId;
      transactionDto.amount = serviceCharge;
      transactionDto.type = TransactionType.SERVICE_CHARGE;
      transactionDto.reference = `TZTX-${uuid()}`;
      transactionDto.status = TransactionStatus.COMPLETE;
      transactionDto.description = `Service charge deduction for cash payment order N${order.totalAmount?.toFixed(2)}.`;
      transactionDto.orderId = order.id;
      this.eventBus.publish(new CreateTransactionEvent(transactionDto));

      this.logger.log(
        `Service charge of N${serviceCharge} deducted from rider ${riderId}'s wallet for cash payment order ${order.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to deduct service charge from rider ${riderId} for order ${order.id}`,
        error?.stack || String(error),
      );
      // Don't throw - service charge deduction failure shouldn't fail order acceptance
    }
  }

  /**
   * Handle order decline:
   * 1. Add the current rider to the declined list
   * 2. Set assigned rider to null
   * 3. Attempt to reassign to a new rider (excluding those who declined)
   */
  private async handleDecline(order: Order, riderId: string): Promise<void> {
    // Add current rider to declined list
    const declinedRiderIds = order.declinedRiderIds || [];
    if (!declinedRiderIds.includes(riderId)) {
      declinedRiderIds.push(riderId);
    }

    // Set assigned rider to null and update declined list

    order.declinedRiderIds = declinedRiderIds;
    order.riderId = null as any;
    order.riderAssigned = false;
    order.riderAssignedAt = null as any;
    await this.orderRepository.save(order);

    // Attempt to reassign to a new rider
    const newRiderId =
      await this.riderService.getRiderForOrder(declinedRiderIds);

    if (newRiderId) {
      // Reload the order with updated declined list
      const updatedOrder = await this.orderRepository.findOne({
        where: { id: order.id },
      });
      if (updatedOrder) {
        await this.assignRider(updatedOrder, newRiderId);
      }
    }
    // If no rider available, order remains unassigned
  }

  /**
   * Get address book for a user based on their order history
   * Returns unique user info entries (sender/recipient) from all orders
   */
  /**
   * Mark a delivery destination as delivered and send push notification to the user
   */
  async markDestinationDelivered({
    orderId,
    destinationId,
  }: MarkDestinationDeliveredDto): Promise<DeliveryDestination> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const destinationRepo =
        queryRunner.manager.getRepository(DeliveryDestination);
      const orderRepo = queryRunner.manager.getRepository(Order);

      // Find the delivery destination
      const destination = await destinationRepo.findOne({
        where: { id: destinationId, orderId },
        relations: ['order', 'order.user'],
      });

      if (!destination) {
        throw new BadRequestException(
          StandardResponse.fail('delivery destination not found'),
        );
      }

      if (destination.delivered) {
        throw new BadRequestException(
          StandardResponse.fail(
            'delivery destination already marked as delivered',
          ),
        );
      }

      // Find the order to get user details
      const order = await orderRepo.findOne({
        where: { id: orderId },
        relations: ['user', 'deliveryDestinations'],
      });

      if (!order) {
        throw new BadRequestException(StandardResponse.fail('order not found'));
      }

      // Mark destination as delivered
      destination.delivered = true;
      destination.deliveredAt = new Date();
      const updatedDestination = await destinationRepo.save(destination);

      // Send push notification to the user who booked the order
      if (order.user && order.userId) {
        try {
          this.eventBus.publish(
            new SendPushNotificationEvent(
              order.userId,
              'Delivery Completed',
              `Your package has been delivered to ${destination.recipient.name || destination.dropOffLocation.address}`,
              {
                orderId: order.id,
                destinationId: destination.id,
                type: 'destination_delivered',
              },
            ),
          );

          // Also create in-app notification
          this.eventBus.publish(
            new CreateNotficationEvent(
              'Delivery Completed',
              `Your package has been delivered to ${destination.recipient.name || destination.dropOffLocation.address}`,
              order.userId,
              `/history/${order.id}`,
            ),
          );
        } catch (notificationError) {
          this.logger.error(
            `Failed to send notification for destination ${destinationId}`,
            notificationError?.stack || String(notificationError),
          );
          // Don't fail the whole operation if notification fails
        }
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Delivery destination ${destinationId} marked as delivered for order ${orderId}`,
      );

      return updatedDestination;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to mark destination ${destinationId} as delivered for order ${orderId}`,
        error?.stack || String(error),
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getAddressBook(
    userId: string,
    dto: SearchAddressBookDto,
  ): Promise<StandardResponse<UserInfo>> {
    const { query, limit = 10, page = 1 } = dto;

    // Build a raw SQL query for better performance
    // This extracts unique contacts from both sender and recipient JSONB fields
    const searchCondition = query?.trim()
      ? `AND (
          LOWER(contact->>'phone') LIKE LOWER($2) OR
          LOWER(contact->>'name') LIKE LOWER($2) OR
          LOWER(contact->>'email') LIKE LOWER($2)
        )`
      : '';

    const searchParam = query?.trim() ? `%${query.trim()}%` : null;

    // First, get unique contacts with their details
    const rawQuery = `
      WITH all_contacts AS (
        SELECT DISTINCT ON ((contact->>'phone'))
          contact->>'name' as name,
          contact->>'email' as email,
          contact->>'phone' as phone,
          contact->>'role' as role
        FROM (
          SELECT sender as contact FROM "order" WHERE "userId" = $1 AND sender IS NOT NULL
          UNION ALL
          SELECT recipient as contact FROM "order" WHERE "userId" = $1 AND recipient IS NOT NULL
        ) contacts
        WHERE (contact->>'phone') IS NOT NULL
        ${searchCondition}
      )
      SELECT * FROM all_contacts
      ORDER BY LOWER(name)
    `;

    const params = searchParam ? [userId, searchParam] : [userId];
    const allContacts: UserInfo[] = await this.orderRepository.query(
      rawQuery,
      params,
    );

    // Paginate in memory (already filtered and deduplicated by DB)
    const total = allContacts.length;
    const skip = (page - 1) * limit;
    const paginatedData = allContacts.slice(skip, skip + limit);

    return StandardResponse.withPagination(
      paginatedData,
      'Address book fetched successfully',
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    );
  }
}
