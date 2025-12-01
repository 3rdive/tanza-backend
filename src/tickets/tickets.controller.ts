import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { Tickets } from './tickets.entity';
import { JwtPayload } from 'src/auth/models/jwt-payload.type';
import { CurrentUser } from 'src/users/user.decorator';
import { BaseUrl } from 'src/constants';
import { CreateTicketDto, UpdateTicketStatusDto } from './ticket.dto';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/roles.enum';

@Controller(BaseUrl.TICKETS)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  async create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Tickets> {
    return this.ticketsService.create(user.sub, dto);
  }

  @Roles(Role.Admin)
  @Get()
  async findAll(): Promise<Tickets[]> {
    return this.ticketsService.findAll();
  }

  @Get('user-tickets')
  async findMyTickets(@CurrentUser() user: JwtPayload): Promise<Tickets[]> {
    return this.ticketsService.findAllForUser(user.sub);
  }

  @Roles(Role.Admin)
  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string): Promise<Tickets[]> {
    return this.ticketsService.findAllForUser(userId);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<Tickets> {
    return this.ticketsService.findById(id);
  }

  @Patch(':id/status')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
  ): Promise<Tickets> {
    return this.ticketsService.updateStatus(id, { status: dto.status });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.ticketsService.remove(id);
  }
}
