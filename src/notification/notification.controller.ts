import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Query,
  Put,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { MarkAsSeenDto } from './dto/mark-as-seen.dto';
import {
  SendPushNotificationDto,
  SendBulkPushNotificationDto,
} from './dto/send-push-notification.dto';
import { Notification } from './notification.entity';
import { CurrentUser } from '../users/user.decorator';
import { JwtPayload } from '../auth/models/jwt-payload.type';
import { BaseUrl } from '../constants';
import { PaginationDto } from '../commons/pagination.dto';

@Controller(BaseUrl.NOTIFICATION)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    createNotificationDto: CreateNotificationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Notification> {
    return await this.notificationService.create(
      user.sub,
      createNotificationDto,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationDto,
  ) {
    return await this.notificationService.findAll(user.sub, pagination);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<Notification> {
    return await this.notificationService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    return await this.notificationService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return await this.notificationService.remove(id);
  }

  @Put('mark-as-seen')
  @HttpCode(HttpStatus.OK)
  async markAsSeen(
    @CurrentUser() user: JwtPayload,
    @Body() markAsSeenDto: MarkAsSeenDto,
  ): Promise<{ message: string; updatedCount: number }> {
    return await this.notificationService.markAsSeen(user.sub, markAsSeenDto);
  }

  @Post('push/send')
  @HttpCode(HttpStatus.OK)
  async sendPushNotification(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    sendPushNotificationDto: SendPushNotificationDto,
  ): Promise<{ message: string }> {
    return await this.notificationService.sendPushNotification(
      sendPushNotificationDto,
    );
  }

  @Post('push/send-bulk')
  @HttpCode(HttpStatus.OK)
  async sendBulkPushNotification(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    sendBulkPushNotificationDto: SendBulkPushNotificationDto,
  ): Promise<{ message: string; sentCount: number; failedCount: number }> {
    return await this.notificationService.sendBulkPushNotification(
      sendBulkPushNotificationDto,
    );
  }
}
