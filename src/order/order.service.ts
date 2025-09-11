import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StandardResponse } from '../commons/standard-response';
import { TransactionDto } from '../wallet/dto/transaction-dto';
import { TransactionStatus } from '../wallet/dto/transaction-status';
import { TransactionType } from '../wallet/entities/transaction-type.enum';
import { CreateTransactionEvent } from '../wallet/events/models/create-transaction.event';
import { WalletService } from '../wallet/services/wallet.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { UserOrderRole } from './entities/user-order-role.enum';

@Injectable()
export class OrderService {
  constructor(
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly eventBus: EventBus,
  ) {}

  //TODO: NEXT WEEK 1). API dommy api for search location 2). API for booking order

  calculateDeliveryFee(
    pickUpLocation: string,
    dropOffLocation: string,
    vechicleType,
  ) {
    const chargePerKM = this.configService.get<number>('CHARGE_PER_KM');
    const serviceCharge = this.configService.get<number>('SERVICE_CHARGE');
    //TODO: call map API
    console.log(
      pickUpLocation,
      dropOffLocation,
      vechicleType,
      chargePerKM,
      serviceCharge,
    );

    return {
      amount: 1_000,
      duration: '1 Hour, 30 Minutes',
      serviceCharge,
      totalAmount: 1_000 + (serviceCharge || 0),
    };
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const { pickUpLocation, dropOffLocation, vehicleType } = dto;
    this.validateUserInfo(dto);

    const { duration, totalAmount, serviceCharge } = this.calculateDeliveryFee(
      pickUpLocation,
      dropOffLocation,
      vehicleType,
    );

    const wallet = await this.walletService.getWallet(userId);
    if (totalAmount > wallet.walletBalance) {
      throw new BadRequestException(
        StandardResponse.fail('insufficient balance'),
      );
    }

    const order = this.orderRepo.create({
      sender: dto.sender,
      recipient: dto.recipient,
      pickUpLocation: dto.pickUpLocation,
      dropOffLocation: dto.dropOffLocation,
      userOrderRole: dto.userOrderRole,
      vehicleType: dto.vehicleType,
      noteForRider: dto.noteForRider,
      serviceChargeAmount: serviceCharge || 0,
      eta: duration || 'N/A',
      totalAmount,
    });

    const saved = await this.orderRepo.save(order);

    await this.walletService.deductAmount(userId, totalAmount);

    const transactionDto = new TransactionDto();
    transactionDto.walletId = wallet.id;
    transactionDto.userId = userId;
    transactionDto.amount = totalAmount;
    transactionDto.type = TransactionType.ORDER;
    transactionDto.status = TransactionStatus.COMPLETE;
    transactionDto.orderId = saved.id;
    this.eventBus.publish(new CreateTransactionEvent(transactionDto));
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
}
