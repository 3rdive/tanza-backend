import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { JwtPayload } from '../auth/models/jwt-payload.type';
import { BaseUrl } from '../constants';
import { CurrentUser } from '../users/user.decorator';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CalculateChargeQueryDto } from './dto/calculate-charge-query.dto';

@Controller(BaseUrl.ORDER)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('calculate-charge')
  async calculateDistance(@Query() query: CalculateChargeQueryDto) {
    const { startLat, startLon, endLat, endLon, vehicleType } = query;

    return this.orderService.calculateDeliveryFee(
      [startLon, startLat], // ORS expects [lon, lat]
      [endLon, endLat],
      vehicleType,
    );
  }

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @Query() query: CalculateChargeQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const { startLat, startLon, endLat, endLon, vehicleType } = query;
    return this.orderService.createOrder(
      user.sub,
      dto,
      [startLon, startLat],
      [endLon, endLat],
      vehicleType,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(+id);
  }
}
