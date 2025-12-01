import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderService } from './order.service';

@Injectable()
export class OrderSchedulerService {
  private readonly logger = new Logger(OrderSchedulerService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderService: OrderService,
  ) {}

  /**
   * Runs every 10 minutes to assign riders to unassigned orders.
   */
  @Cron('0 */10 * * * *')
  async assignRidersToUnassignedOrders() {
    this.logger.log(
      'Starting scheduled task to assign riders to unassigned orders',
    );

    try {
      // Fetch orders where rider has not been assigned
      const unassignedOrders = await this.orderRepository.find({
        where: {
          riderAssigned: false,
        },
      });

      this.logger.log(`Found ${unassignedOrders.length} unassigned orders`);

      for (const order of unassignedOrders) {
        try {
          await this.orderService.assignRiderToOrder(order.id);
          this.logger.log(`Assigned rider to order ${order.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to assign rider to order ${order.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        'Completed scheduled task to assign riders to unassigned orders',
      );
    } catch (error) {
      this.logger.error(`Error in scheduled task: ${error.message}`);
    }
  }
}
