import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { StandardResponse } from '../../commons/standard-response';
import { TransactionDto } from '../../wallet/dto/transaction-dto';
import { TransactionStatus } from '../../wallet/dto/transaction-status';
import { TransactionType } from '../../wallet/entities/transaction-type.enum';
import { Wallets } from '../../wallet/entities/wallet.entity';
import { CreateTransactionEvent } from '../../wallet/events/models/create-transaction.event';
import { WalletService } from '../../wallet/services/wallet.service';
import { CreateMultipleDeliveryOrderDto } from '../dto/create-multiple-delivery-order.dto';
import { DeliveryDestination } from '../entities/delivery-destination.entity';
import { OrderTracking } from '../entities/order-tracking.entity';
import { Order } from '../entities/order.entity';
import { TrackingStatus } from '../entities/tracking-status.enum';
import { UserOrderRole } from '../entities/user-order-role.enum';
import { CalculateDeliveryChargesUsecase } from './calculate-delivery-charges.usecase';
import { RiderService } from '../../users/services/rider.service';

@Injectable()
export class CreateOrderUsecase {
  private readonly logger = new Logger(CreateOrderUsecase.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderTracking)
    private readonly orderTrackingRepository: Repository<OrderTracking>,
    @InjectRepository(DeliveryDestination)
    private readonly deliveryDestinationRepository: Repository<DeliveryDestination>,
    private readonly eventBus: EventBus,
    private readonly calculateDeliveryChargesUsecase: CalculateDeliveryChargesUsecase,
    private readonly walletService: WalletService,
    private readonly dataSource: DataSource,
    private readonly riderService: RiderService,
  ) {}

  async createMultipleDeliveryOrder(
    userId: string,
    dto: CreateMultipleDeliveryOrderDto,
  ): Promise<StandardResponse<Order>> {
    const urgencyFee = dto.urgencyFee || 0; // Can be configurable

    // Calculate delivery charges for multiple destinations
    const deliveryLocations = dto.deliveryLocations.map(
      (loc) => loc.coordinates,
    );

    const chargeResult =
      await this.calculateDeliveryChargesUsecase.calculateMultipleDeliveryFee(
        dto.pickUpCoordinates,
        deliveryLocations,
        dto.isUrgent || false,
        urgencyFee,
      );

    // Check wallet balance
    const walletDto = await this.walletService.getUserWallet(userId);
    if (chargeResult.totalAmount > walletDto.walletBalance) {
      throw new BadRequestException(
        StandardResponse.fail('insufficient balance'),
      );
    }

    // Create order entity
    const order = new Order();
    order.userId = userId;
    order.sender = {
      name: dto.sender.name,
      email: dto.sender.email || '',
      phone: dto.sender.phone,
      role: dto.userOrderRole,
    };

    // For multiple deliveries, use first recipient for backward compatibility
    const firstRecipient = dto.deliveryLocations[0].recipient;
    order.recipient = {
      name: firstRecipient.name,
      email: firstRecipient.email || '',
      phone: firstRecipient.phone,
      role:
        dto.userOrderRole === UserOrderRole.SENDER
          ? UserOrderRole.RECIPIENT
          : UserOrderRole.SENDER,
    };

    order.pickUpLocation = {
      longitude: String(dto.pickUpCoordinates[0]),
      latitude: String(dto.pickUpCoordinates[1]),
      address: dto.pickUpAddress,
    };

    // Set first delivery as primary dropoff for backward compatibility
    const firstDelivery = dto.deliveryLocations[0];
    order.dropOffLocation = {
      longitude: String(firstDelivery.coordinates[0]),
      latitude: String(firstDelivery.coordinates[1]),
      address: firstDelivery.address,
    };

    order.userOrderRole = dto.userOrderRole;
    order.vehicleType = chargeResult.vehicleType;
    order.noteForRider = dto.noteForRider || '';
    order.serviceChargeAmount = chargeResult.serviceCharge;
    order.eta = chargeResult.estimatedTotalDuration;
    order.totalAmount = chargeResult.totalAmount;
    order.deliveryFee = chargeResult.totalDeliveryFee;
    order.distanceInKm = chargeResult.totalDistanceKm;
    order.isUrgent = dto.isUrgent || false;
    order.hasMultipleDeliveries = dto.deliveryLocations.length > 1;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepo = queryRunner.manager.getRepository(Order);
      const walletRepo = queryRunner.manager.getRepository(Wallets);
      const trackingRepo = queryRunner.manager.getRepository(OrderTracking);
      const destinationRepo =
        queryRunner.manager.getRepository(DeliveryDestination);

      // Save order
      const savedOrder = await orderRepo.save(order);

      // Create delivery destinations
      for (let i = 0; i < dto.deliveryLocations.length; i++) {
        const deliveryLoc = dto.deliveryLocations[i];
        const deliveryCharge = chargeResult.deliveries[i];

        const destination = new DeliveryDestination();
        destination.orderId = savedOrder.id;
        destination.dropOffLocation = {
          longitude: String(deliveryLoc.coordinates[0]),
          latitude: String(deliveryLoc.coordinates[1]),
          address: deliveryLoc.address,
        };
        destination.recipient = {
          name: deliveryLoc.recipient.name,
          email: deliveryLoc.recipient.email || '',
          phone: deliveryLoc.recipient.phone,
          role:
            dto.userOrderRole === UserOrderRole.SENDER
              ? UserOrderRole.RECIPIENT
              : UserOrderRole.SENDER,
        };
        destination.distanceFromPickupKm =
          deliveryCharge.distance_from_pickup_km;
        destination.durationFromPickup = deliveryCharge.duration_from_pickup;
        destination.deliveryFee = deliveryCharge.deliveryFee;

        await destinationRepo.save(destination);
      }

      // Deduct from wallet
      const wallet = await walletRepo.findOne({ where: { userId } });
      if (!wallet) {
        throw new BadRequestException(
          StandardResponse.fail('wallet not found'),
        );
      }
      wallet.walletBalance -= chargeResult.totalAmount;
      await walletRepo.save(wallet);

      // Create order tracking
      const orderTracking = new OrderTracking();
      orderTracking.orderId = savedOrder.id;
      orderTracking.note = 'Order created';
      orderTracking.status = TrackingStatus.PENDING;
      await trackingRepo.save(orderTracking);

      await queryRunner.commitTransaction();

      // Create transaction event
      const transactionDto = new TransactionDto();
      transactionDto.walletId = wallet.id;
      transactionDto.userId = userId;
      transactionDto.amount = chargeResult.totalAmount;
      transactionDto.type = TransactionType.ORDER;
      transactionDto.reference = `TZTX-${uuid()}`;
      transactionDto.status = TransactionStatus.COMPLETE;
      transactionDto.description = `Placed Order of N${chargeResult.totalAmount} for ${dto.deliveryLocations.length} delivery location(s).`;
      transactionDto.orderId = savedOrder.id;
      this.eventBus.publish(new CreateTransactionEvent(transactionDto));

      // Assign rider to order based on pickup location
      await this.assignRiderToOrder(savedOrder.id, dto.pickUpCoordinates);

      return StandardResponse.ok(
        savedOrder,
        'Multiple delivery order created successfully',
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Failed to create multiple delivery order',
        error?.stack || String(error),
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Assign a rider to the order based on pickup location
   */
  private async assignRiderToOrder(
    orderId: string,
    pickupCoordinates: [number, number],
  ): Promise<void> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        this.logger.warn(`Order ${orderId} not found for rider assignment`);
        return;
      }

      const excludedRiderIds = order.declinedRiderIds || [];
      const riderId = await this.riderService.getRiderForOrder(
        excludedRiderIds,
        pickupCoordinates,
      );

      if (!riderId) {
        this.logger.warn(
          `No available rider found for order ${orderId} assignment`,
        );
        return;
      }

      // Update order with rider assignment
      await this.orderRepository.update(orderId, {
        riderId,
        riderAssigned: true,
        riderAssignedAt: new Date(),
      });

      this.logger.log(`Rider ${riderId} assigned to order ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to assign rider to order ${orderId}`,
        error?.stack || String(error),
      );
      // Don't throw - rider assignment failure shouldn't fail order creation
    }
  }
}
