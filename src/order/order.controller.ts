import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { JwtPayload } from '../auth/models/jwt-payload.type';
import { BaseUrl } from '../constants';
import { CurrentUser } from '../users/user.decorator';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller(BaseUrl.ORDER)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: JwtPayload) {
    return this.orderService.createOrder(user.sub, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(+id);
  }
}
