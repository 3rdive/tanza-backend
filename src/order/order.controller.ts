import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { JwtPayload } from '../auth/models/jwt-payload.type';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { BaseUrl } from '../constants';
import { CurrentUser } from '../users/user.decorator';
import { OrderRiderPaginationDto } from '../wallet/dto/OrderRiderPaginationDto';
import { CalculateChargeQueryDto } from './dto/calculate-charge-query.dto';
import { CalculateMultipleDeliveryFeeDto } from './dto/calculate-multiple-delivery-fee.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateMultipleDeliveryOrderDto } from './dto/create-multiple-delivery-order.dto';
import { OrderTrackingDto } from './dto/order-tracking.dto';
import { RiderFeedbackDto } from './dto/rider-feedback.dto';
import { OrderService } from './order.service';
import { CalculateDeliveryChargesUsecase } from './usecasses/calculate-delivery-charges.usecase';
import { CreateOrderUsecase } from './usecasses/create-order.usecase';
import { SearchAddressBookDto } from './dto/search-address-book.dto';
import { MarkDestinationDeliveredDto } from './dto/mark-destination-delivered.dto';

@Controller(BaseUrl.ORDER)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly calculateDeliveryChargesUsecase: CalculateDeliveryChargesUsecase,
    private readonly createOrderUsecase: CreateOrderUsecase,
  ) {}

  @Get('calculate-charge')
  async calculateDistance(@Query() query: CalculateChargeQueryDto) {
    const { startLat, startLon, endLat, endLon, isUrgent, urgencyFee } = query;

    return this.calculateDeliveryChargesUsecase.calculateDeliveryFee(
      [startLon, startLat], //  [lon, lat]
      [endLon, endLat],
      isUrgent || false,
      urgencyFee!,
    );
  }

  @Post('calculate-multiple-delivery-charge')
  async calculateMultipleDeliveryCharge(
    @Body() dto: CalculateMultipleDeliveryFeeDto,
  ) {
    return this.calculateDeliveryChargesUsecase.calculateMultipleDeliveryFee(
      dto.pickupLocation,
      dto.deliveryLocations,
      dto.isUrgent || false,
      dto.urgencyFee,
    );
  }

  @Post('multiple-delivery')
  async createMultipleDeliveryOrder(
    @Body() dto: CreateMultipleDeliveryOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createOrderUsecase.createMultipleDeliveryOrder(user.sub, dto);
  }

  // @Post()
  // create(
  //   @Body() dto: CreateOrderDto,
  //   @Query() query: CalculateChargeQueryDto,
  //   @CurrentUser() user: JwtPayload,
  // ) {
  //   const { startLat, startLon, endLat, endLon, isUrgent, urgencyFee } = query;
  //   return this.orderService.createOrder(
  //     user.sub,
  //     dto,
  //     [startLon, startLat],
  //     [endLon, endLat],
  //     isUrgent || false,
  //     urgencyFee!,
  //   );
  // }

  @Post('tracking')
  async addTracking(@Param('id') id: string, @Body() dto: OrderTrackingDto) {
    return this.orderService.addOrderTracking(dto);
  }

  @Delete('tracking/:id')
  async removeTracking(@Param('id') id: string) {
    return this.orderService.removeOrderTracking(id);
  }

  @Roles(Role.RIDER)
  @Get('orders/rider')
  async getOrdersByRider(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: OrderRiderPaginationDto,
  ) {
    return this.orderService.getRiderOrders(user.sub, pagination);
  }

  @Roles(Role.Admin)
  @Get('rider/unrewarded')
  async getCompletedUnrewardedOrders(@CurrentUser() user: JwtPayload) {
    return this.orderService.getCompletedUnrewardedOrdersForRider(user.sub);
  }

  @Roles(Role.User)
  @Post(':id/reward')
  async rewardRider(@Param('id') id: string) {
    return this.orderService.rewardRider(id);
  }

  @Get('active-orders')
  async getActiveOrders(@CurrentUser() user: JwtPayload) {
    return this.orderService.getActiveOrders(user.sub);
  }

  @Get('assigned-orders')
  async getAssigned(@CurrentUser() user: JwtPayload) {
    return this.orderService.getAssignedOrders(user.sub);
  }

  @Put(':id/assign-rider')
  async assignOrderToRider(@Param('id') orderId: string) {
    return this.orderService.assignRiderToOrder(orderId);
  }

  @Roles(Role.RIDER)
  @Post('rider-feedback')
  async handleRiderFeedback(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RiderFeedbackDto,
  ) {
    return this.orderService.handleRiderFeedback(user.sub, dto);
  }

  @Get('address-book')
  async getAddressBook(
    @CurrentUser() user: JwtPayload,
    @Query() dto: SearchAddressBookDto,
  ) {
    return this.orderService.getAddressBook(user.sub, dto);
  }

  @Roles(Role.RIDER)
  @Post('destination/delivered')
  async markDestinationDelivered(@Body() dto: MarkDestinationDeliveredDto) {
    return this.orderService.markDestinationDelivered(dto);
  }

  //this should come last to avoid route conflicts
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }
}
