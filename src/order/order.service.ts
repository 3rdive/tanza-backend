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

@Injectable()
export class OrderService {
  constructor(
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderTracking)
    private readonly orderTrackingRepository: Repository<OrderTracking>,
    private readonly eventBus: EventBus,
    private readonly locationService: LocationService,
  ) {}

  //TODO: NEXT WEEK 1). API dommy api for search location 2). API for booking order

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

    const chargePerKM = this.configService.get<number>('CHARGE_PER_KM', 200);
    const serviceChargepercent = this.configService.get<number>(
      'SERVICE_CHARGE_PERCENT',
      0,
    );
    //TODO: call map API

    const deliveryFee = NumberUtil.multiply(distance_in_km, chargePerKM);
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

    const wallet = await this.walletService.getWallet(userId);
    if (totalAmount > wallet.walletBalance) {
      throw new BadRequestException(
        StandardResponse.fail('insufficient balance'),
      );
    }

    const order = this.orderRepo.create({
      sender: dto.sender,
      recipient: dto.recipient,
      userId: userId,
      pickUpLocation: dto.pickUpLocation,
      dropOffLocation: dto.dropOffLocation,
      userOrderRole: dto.userOrderRole,
      vehicleType: dto.vehicleType,
      noteForRider: dto.noteForRider,
      serviceChargeAmount: serviceCharge || 0,
      eta: duration || 'N/A',
      totalAmount,
      deliveryFee,
    });

    const saved = await this.orderRepo.save(order);

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

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  async addOrderTracking({ orderId, note, status }: OrderTrackingDto) {
    const orderTracking = new OrderTracking();
    orderTracking.orderId = orderId;
    orderTracking.note = note;
    orderTracking.status = status;
    await this.orderTrackingRepository.save(orderTracking);
  }
}
