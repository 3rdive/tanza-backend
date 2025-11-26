import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification } from './notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { MarkAsSeenDto } from './dto/mark-as-seen.dto';
import { PaginationService } from '../commons/pagination.service';
import { StandardResponse } from '../commons/standard-response';
import { PaginationDto } from '../commons/pagination.dto';
import {
  SendPushNotificationDto,
  SendBulkPushNotificationDto,
} from './dto/send-push-notification.dto';
import { User } from '../users/user.entity';
import { EventBus } from '@nestjs/cqrs';
import { SendPushNotificationEvent } from './send-push-notification.event';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventBus: EventBus,
  ) {}

  async create(
    userId: string,
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    try {
      const notification = this.notificationRepository.create(
        createNotificationDto,
      );
      notification.userId = userId;
      const savedNotification =
        await this.notificationRepository.save(notification);
      this.logger.log(`Notification created with ID: ${savedNotification.id}`);
      return savedNotification;
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      throw new BadRequestException('Failed to create notification');
    }
  }

  async findAll(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<StandardResponse<Notification>> {
    try {
      const { limit = 10, page = 1 } = paginationDto;

      const result = await PaginationService.findWithPagination({
        repository: this.notificationRepository,
        paginationDto: { limit, page },
        where: { userId },
        orderBy: 'created_at',
        orderDirection: 'DESC',
      });

      return StandardResponse.withPagination(
        result.data,
        'Notifications fetched successfully',
        result.pagination,
      );
    } catch (error) {
      this.logger.error('Failed to fetch notifications', error);
      throw new BadRequestException('Failed to fetch notifications');
    }
  }

  async findOne(id: string): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id },
      });

      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }

      return notification;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch notification with ID ${id}`, error);
      throw new BadRequestException('Failed to fetch notification');
    }
  }

  async update(
    id: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    try {
      const notification = await this.findOne(id);

      Object.assign(notification, updateNotificationDto);

      const updatedNotification =
        await this.notificationRepository.save(notification);
      this.logger.log(`Notification with ID ${id} updated`);
      return updatedNotification;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update notification with ID ${id}`, error);
      throw new BadRequestException('Failed to update notification');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const notification = await this.findOne(id);
      await this.notificationRepository.remove(notification);
      this.logger.log(`Notification with ID ${id} deleted`);
      return { message: `Notification with ID ${id} successfully deleted` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete notification with ID ${id}`, error);
      throw new BadRequestException('Failed to delete notification');
    }
  }

  async markAsSeen(
    userId: string,
    markAsSeenDto: MarkAsSeenDto,
  ): Promise<{ message: string; updatedCount: number }> {
    try {
      const { notificationIds } = markAsSeenDto;

      // Update only notifications that belong to the user
      const result = await this.notificationRepository.update(
        {
          id: In(notificationIds),
          userId,
        },
        {
          hasSeen: true,
        },
      );

      this.logger.log(
        `Marked ${result.affected} notifications as seen for user ${userId}`,
      );

      return {
        message: `Successfully marked ${result.affected} notification(s) as seen`,
        updatedCount: result.affected || 0,
      };
    } catch (error) {
      this.logger.error('Failed to mark notifications as seen', error);
      throw new BadRequestException('Failed to mark notifications as seen');
    }
  }

  async sendPushNotification(
    sendPushNotificationDto: SendPushNotificationDto,
  ): Promise<{ message: string }> {
    try {
      const { userId, title, body, data } = sendPushNotificationDto;

      // Verify user exists and has push notifications enabled
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      if (!user.expoPushNotificationToken || !user.hasSetUpNotification) {
        throw new BadRequestException(
          `User ${userId} does not have push notifications enabled`,
        );
      }

      // Publish event to send push notification
      this.eventBus.publish(
        new SendPushNotificationEvent(userId, title, body, data),
      );

      this.logger.log(`Push notification queued for user ${userId}`);

      return {
        message: `Push notification sent successfully to user ${userId}`,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to send push notification', error);
      throw new BadRequestException('Failed to send push notification');
    }
  }

  async sendBulkPushNotification(
    sendBulkPushNotificationDto: SendBulkPushNotificationDto,
  ): Promise<{ message: string; sentCount: number; failedCount: number }> {
    try {
      const { userIds, title, body } = sendBulkPushNotificationDto;

      // Fetch users with push notifications enabled
      const users = await this.userRepository.find({
        where: {
          id: In(userIds),
          hasSetUpNotification: true,
        },
      });

      if (users.length === 0) {
        throw new BadRequestException(
          'No users found with push notifications enabled',
        );
      }

      let sentCount = 0;
      let failedCount = 0;

      // Send push notification to each user
      for (const user of users) {
        try {
          if (user.expoPushNotificationToken) {
            this.eventBus.publish(
              new SendPushNotificationEvent(user.id, title, body),
            );
            sentCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to queue push notification for user ${user.id}`,
            error,
          );
          failedCount++;
        }
      }

      this.logger.log(
        `Bulk push notification: ${sentCount} sent, ${failedCount} failed`,
      );

      return {
        message: `Bulk push notification completed`,
        sentCount,
        failedCount,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to send bulk push notification', error);
      throw new BadRequestException('Failed to send bulk push notification');
    }
  }
}
