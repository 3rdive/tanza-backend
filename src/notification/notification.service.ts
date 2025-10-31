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

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
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
}
