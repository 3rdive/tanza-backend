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
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderTrackingDto } from './dto/order-tracking.dto';
import { RiderFeedbackDto } from './dto/rider-feedback.dto';
import { OrderService } from './order.service';

@Controller(BaseUrl.ORDER)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('calculate-charge')
  async calculateDistance(@Query() query: CalculateChargeQueryDto) {
    const { startLat, startLon, endLat, endLon, vehicleType, isUrgent } = query;

    return this.orderService.calculateDeliveryFee(
      [startLon, startLat], //  [lon, lat]
      [endLon, endLat],
      vehicleType,
      isUrgent || false,
    );
  }

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @Query() query: CalculateChargeQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const { startLat, startLon, endLat, endLon, vehicleType, isUrgent } = query;
    return this.orderService.createOrder(
      user.sub,
      dto,
      [startLon, startLat],
      [endLon, endLat],
      vehicleType,
      isUrgent || false,
    );
  }

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

  //this should come last to avoid route conflicts
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }
}
