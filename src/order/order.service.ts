import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { NumberUtil } from '../commons/number.util';
import { StandardResponse } from '../commons/standard-response';
import { LocationService } from '../location/location.service';
import { TransactionDto } from '../wallet/dto/transaction-dto';
import { TransactionStatus } from '../wallet/dto/transaction-status';
import { TransactionType } from '../wallet/entities/transaction-type.enum';
import { CreateTransactionEvent } from '../wallet/events/models/create-transaction.event';
import { WalletService } from '../wallet/services/wallet.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderTrackingDto } from './dto/order-tracking.dto';
import { OrderTracking } from './entities/order-tracking.entity';
import { Order } from './entities/order.entity';
import { TrackingStatus } from './entities/tracking-status.enum';
import { UserOrderRole } from './entities/user-order-role.enum';
import { VehicleType } from './entities/vehicle-type.enum';
import { OrderMapper } from './mappers/order.mapper';

@Injectable()
export class OrderService {
  constructor(
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderTracking)
    private readonly orderTrackingRepository: Repository<OrderTracking>,
    private readonly eventBus: EventBus,
    private readonly locationService: LocationService,
  ) {}

  async calculateDeliveryFee(
    start: [number, number], // [lon, lat]
    end: [number, number],
    vehicleType: VehicleType,
  ) {
    const { distance_in_km, duration_in_words } =
      await this.locationService.calculateDistance(
        start,
        end,
        vehicleType == VehicleType.BIKE ? 'cycling-regular' : 'driving-car',
      );

    const bikeChargePerKM = this.configService.get<number>(
      'RIDER_RATE_PER_KM',
      200,
    );

    const vanChargePerKM = this.configService.get<number>(
      'DRIVER_RATE_PER_KM',
      200,
    );
    const serviceChargepercent = this.configService.get<number>(
      'SERVICE_CHARGE_PERCENT',
      0,
    );
    //TODO: call map API

    const deliveryFee = NumberUtil.multiply(
      distance_in_km,
      vehicleType == VehicleType.VAN ? vanChargePerKM : bikeChargePerKM,
    );
    const serviceChargeAmount = NumberUtil.multiply(
      deliveryFee,
      serviceChargepercent,
    );
    const totalAmount = NumberUtil.add(serviceChargeAmount, deliveryFee);

    return {
      totalAmount: totalAmount,
      deliveryFee: deliveryFee,
      serviceCharge: serviceChargeAmount,
      duration: duration_in_words,
    };
  }

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
    start: [number, number],
    end: [number, number],
    vehicleType: VehicleType,
  ) {
    // this.validateUserInfo(dto);

    const { duration, totalAmount, serviceCharge, deliveryFee } =
      await this.calculateDeliveryFee(start, end, vehicleType);

    const wallet = await this.walletService.getUserWallet(userId);
    if (totalAmount > wallet.walletBalance) {
      throw new BadRequestException(
        StandardResponse.fail('insufficient balance'),
      );
    }

    const order = OrderMapper.toEntity(
      dto,
      userId,
      start,
      end,
      serviceCharge,
      duration,
      totalAmount,
      deliveryFee,
    );

    const saved = await this.orderRepository.save(order);

    await this.walletService.deductAmount(userId, totalAmount);

    const transactionDto = new TransactionDto();
    transactionDto.walletId = wallet.id;
    transactionDto.userId = userId;
    transactionDto.amount = totalAmount;
    transactionDto.type = TransactionType.ORDER;
    transactionDto.reference = `TZTX-${uuid()}`;
    transactionDto.status = TransactionStatus.COMPLETE;
    transactionDto.description = `Placed Order of N${totalAmount} for delivery.`;
    transactionDto.orderId = saved.id;
    this.eventBus.publish(new CreateTransactionEvent(transactionDto));

    await this.addOrderTracking({
      orderId: order.id,
      note: 'Order created',
      status: TrackingStatus.PENDING,
    });
    return StandardResponse.ok(saved, 'Order created successfully');
  }

  async findOne(id: string) {
    return this.orderRepository.findOne({
      where: { id },
      relations: ['orderTracking', 'transactions'],
    });
  }

  validateUserInfo(dto: CreateOrderDto) {
    if (dto.userOrderRole === UserOrderRole.SENDER) {
      if (!dto.sender?.name || !dto.sender?.email || !dto.sender?.phone) {
        return StandardResponse.fail(
          'Sender details are missing',
          'Sender details are missing',
        );
      }
    } else if (dto.userOrderRole === UserOrderRole.RECIPIENT) {
      if (
        !dto.recipient?.name ||
        !dto.recipient?.email ||
        !dto.recipient?.phone
      ) {
        return StandardResponse.fail(
          'Recipient details are missing',
          'Recipient details are missing',
        );
      }
    }
  }

  async addOrderTracking({ orderId, note, status }: OrderTrackingDto) {
    // Ensure the order exists
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new BadRequestException(StandardResponse.fail('order not found'));
    }

    // Prevent duplicate tracking status for the same order
    const exists = await this.orderTrackingRepository.findOne({
      where: { orderId, status },
    });
    if (exists) {
      throw new BadRequestException(
        StandardResponse.fail(
          'tracking with the same status already exists for this order',
        ),
      );
    }

    const orderTracking = new OrderTracking();
    orderTracking.orderId = orderId;
    orderTracking.note = note;
    orderTracking.status = status;
    await this.orderTrackingRepository.save(orderTracking);
  }

  async removeOrderTracking(trackingId: string) {
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
}
