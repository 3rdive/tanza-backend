import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, In } from 'typeorm';
import { User } from '../users/user.entity';
import { Order } from '../order/entities/order.entity';
import { OrderTracking } from '../order/entities/order-tracking.entity';
import { Wallets } from '../wallet/entities/wallet.entity';
import { Transactions } from '../wallet/entities/transaction.entity';
import { RiderInfo } from '../users/rider-info.entity';
import { DocumentStatus } from '../users/document-status.enum';
import { Role } from '../auth/roles.enum';
import { TrackingStatus } from '../order/entities/tracking-status.enum';
import { StandardResponse } from '../commons/standard-response';
import { RegisterAdminDto } from './dto/register-admin.dto';
import * as bcrypt from 'bcrypt';
import { RegMode } from '../users/reg-mode.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderTracking)
    private readonly orderTrackingRepository: Repository<OrderTracking>,
    @InjectRepository(Wallets)
    private readonly walletRepository: Repository<Wallets>,
    @InjectRepository(Transactions)
    private readonly transactionRepository: Repository<Transactions>,
    @InjectRepository(RiderInfo)
    private readonly riderInfoRepository: Repository<RiderInfo>,
  ) {}

  /**
   * Get all users with optional role filter
   */
  async getAllUsers(role?: Role, page: number = 1, limit: number = 50) {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.mobile',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.profilePic',
        'user.countryCode',
        'user.registrationDate',
        'user.updatedAt',
        'user.registrationMode',
      ])
      .orderBy('user.registrationDate', 'DESC');

    if (role) {
      queryBuilder.where('user.role = :role', { role });
    }

    const skip = (page - 1) * limit;
    const [users, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return StandardResponse.ok(
      {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Request Successful',
    );
  }

  /**
   * Register a new admin user
   */
  async registerAdmin(registerAdminDto: RegisterAdminDto) {
    const { email, mobile, firstName, lastName, password, countryCode } =
      registerAdminDto;

    // Check if email already exists
    if (email) {
      const emailExists = await this.userRepository.exists({
        where: { email: email.toLowerCase().trim() },
      });
      if (emailExists) {
        throw new BadRequestException(
          StandardResponse.fail('Email already exists'),
        );
      }
    }

    // Check if mobile already exists
    const mobileExists = await this.userRepository.exists({
      where: { mobile },
    });
    if (mobileExists) {
      throw new BadRequestException(
        StandardResponse.fail('Mobile number already exists'),
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin user
    const newAdmin = this.userRepository.create({
      email: email ? email.toLowerCase().trim() : undefined,
      mobile,
      firstName,
      lastName,
      password: hashedPassword,
      role: Role.Admin,
      countryCode: countryCode || '+234',
      registrationMode: RegMode.MANUAL,
    });

    const savedAdmin = await this.userRepository.save(newAdmin);

    // Remove password from response
    const { password: _, ...adminWithoutPassword } = savedAdmin;

    return StandardResponse.ok(
      adminWithoutPassword,
      'Admin registered successfully',
    );
  }

  /**
   * Get statistical data for dashboard
   */
  async getStatisticalData() {
    // Total users count
    const totalUsers = await this.userRepository.count();

    // Users by role
    const usersByRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    // Total orders count
    const totalOrders = await this.orderRepository.count();

    // Get latest order tracking status for each order
    const ordersByStatus = await this.orderTrackingRepository
      .createQueryBuilder('tracking')
      .select('tracking.status', 'status')
      .addSelect('COUNT(DISTINCT tracking.orderId)', 'count')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(ot.createdAt)')
          .from(OrderTracking, 'ot')
          .where('ot.orderId = tracking.orderId')
          .getQuery();
        return 'tracking.createdAt = ' + subQuery;
      })
      .groupBy('tracking.status')
      .getRawMany();

    // Calculate total revenue (sum of all order totalAmount)
    const revenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'totalRevenue')
      .getRawOne();

    // Recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await this.userRepository.count({
      where: {
        registrationDate: MoreThanOrEqual(sevenDaysAgo) as any,
      },
    });

    // Recent orders (last 7 days)
    const recentOrders = await this.orderRepository.count({
      where: {
        createdAt: MoreThanOrEqual(sevenDaysAgo) as any,
      },
    });

    // Total wallets and balance
    const walletStats = await this.walletRepository
      .createQueryBuilder('wallet')
      .select('COUNT(*)', 'totalWallets')
      .addSelect('SUM(wallet.balance)', 'totalBalance')
      .getRawOne();

    return StandardResponse.ok(
      {
        users: {
          total: totalUsers,
          byRole: usersByRole,
          recentSevenDays: recentUsers,
        },
        orders: {
          total: totalOrders,
          byStatus: ordersByStatus,
          recentSevenDays: recentOrders,
        },
        revenue: {
          total: parseFloat(revenueResult?.totalRevenue || '0'),
        },
        wallets: {
          total: parseInt(walletStats?.totalWallets || '0'),
          totalBalance: parseFloat(walletStats?.totalBalance || '0'),
        },
      },
      'Request Successful',
    );
  }

  /**
   * Get all orders with optional status filter
   */
  async getAllOrders(
    status?: TrackingStatus,
    page: number = 1,
    limit: number = 50,
  ) {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.rider', 'rider')
      .leftJoinAndSelect('order.orderTracking', 'tracking')
      .select([
        'order.id',
        'order.pickUpLocation',
        'order.dropOffLocation',
        'order.sender',
        'order.recipient',
        'order.userOrderRole',
        'order.vehicleType',
        'order.noteForRider',
        'order.serviceChargeAmount',
        'order.deliveryFee',
        'order.totalAmount',
        'order.eta',
        'order.createdAt',
        'order.updatedAt',
        'order.riderAssigned',
        'order.riderAssignedAt',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.mobile',
        'rider.id',
        'rider.firstName',
        'rider.lastName',
        'rider.email',
        'rider.mobile',
        'tracking.id',
        'tracking.status',
        'tracking.createdAt',
        'tracking.location',
      ])
      .orderBy('order.createdAt', 'DESC');

    // If status filter is provided, join with latest tracking and filter by status
    if (status) {
      queryBuilder
        .innerJoin(
          (qb) =>
            qb
              .select('ot.orderId', 'order_id')
              .addSelect('MAX(ot.createdAt)', 'max_created_at')
              .from(OrderTracking, 'ot')
              .groupBy('ot.orderId'),
          'latest_tracking',
          'latest_tracking.orderId = order.id',
        )
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('tracking2.status')
            .from(OrderTracking, 'tracking2')
            .where('tracking2.orderId = order.id')
            .andWhere('tracking2.createdAt = latest_tracking.max_created_at')
            .getQuery();
          return `${subQuery} = :status`;
        })
        .setParameter('status', status);
    }

    // Pagination
    const skip = (page - 1) * limit;
    const [orders, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return StandardResponse.ok(
      {
        orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Request Successful',
    );
  }

  /**
   * Get a simplified list of orders (DTO) with pagination and simple status filter
   * Returns: id, status, isRiderAssigned, hasRewardedRider, deliveryFee, totalAmount
   */
  async getOrdersList(
    status?: 'pending' | 'inprogress' | 'completed',
    page: number = 1,
    limit: number = 50,
  ) {
    const statusMap: Record<string, TrackingStatus[]> = {
      pending: [TrackingStatus.PENDING],
      inprogress: [
        TrackingStatus.ACCEPTED,
        TrackingStatus.PICKED_UP,
        TrackingStatus.TRANSIT,
      ],
      completed: [TrackingStatus.DELIVERED],
    };

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .select([
        'order.id AS id',
        'order.riderAssigned AS "isRiderAssigned"',
        'order.hasRewardedRider AS "hasRewardedRider"',
        'order.deliveryFee AS "deliveryFee"',
        'order.totalAmount AS "totalAmount"',
      ])
      .innerJoin(
        (qb) =>
          qb
            .select('ot.orderId', 'order_id')
            .addSelect('MAX(ot.createdAt)', 'max_created_at')
            .from(OrderTracking, 'ot')
            .groupBy('ot.orderId'),
        'latest_tracking',
        'latest_tracking.order_id = order.id',
      )
      .innerJoin(
        OrderTracking,
        'tracking',
        'tracking.orderId = order.id AND tracking.createdAt = latest_tracking.max_created_at',
      )
      .addSelect('tracking.status', 'status')
      .orderBy('order.createdAt', 'DESC');

    if (status) {
      const mapped = statusMap[status];
      if (!mapped) {
        throw new BadRequestException(
          StandardResponse.fail(
            'Invalid status. Allowed: pending, inprogress, completed',
          ),
        );
      }
      queryBuilder.andWhere('tracking.status IN (:...statuses)', {
        statuses: mapped,
      });
    }

    const skip = (page - 1) * limit;
    const total = await queryBuilder.getCount();
    const rawRows = await queryBuilder.skip(skip).take(limit).getRawMany();

    const orders = rawRows.map((r: any) => ({
      id: r.id,
      status: r.status,
      isRiderAssigned:
        r.isRiderAssigned === true ||
        r.isRiderAssigned === 'true' ||
        r.isRiderAssigned === 1 ||
        r.isRiderAssigned === '1',
      hasRewardedRider:
        r.hasRewardedRider === true ||
        r.hasRewardedRider === 'true' ||
        r.hasRewardedRider === 1 ||
        r.hasRewardedRider === '1',
      deliveryFee: parseFloat(r.deliveryFee ?? '0'),
      totalAmount: parseFloat(r.totalAmount ?? '0'),
    }));

    return StandardResponse.ok(
      {
        orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Orders retrieved successfully',
    );
  }

  /**
   * Get analytics with date filter
   */
  async getAnalytics(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const dateFilter = start && end ? Between(start, end) : undefined;
    const userDateFilter = dateFilter ? { registrationDate: dateFilter } : {};
    const orderDateFilter = dateFilter ? { createdAt: dateFilter } : {};

    // Users count
    const usersCount = await this.userRepository.count({
      where: { role: Role.User },
    });

    // Riders count (Approved & Unapproved)
    const approvedRidersCount = await this.userRepository.count({
      where: {
        role: Role.RIDER,
        riderInfo: { documentStatus: DocumentStatus.APPROVED },
      },
      relations: ['riderInfo'],
    });

    const unapprovedRidersCount = await this.userRepository.count({
      where: {
        role: Role.RIDER,
        riderInfo: { documentStatus: Not(DocumentStatus.APPROVED) },
      },
      relations: ['riderInfo'],
    });

    // Orders count
    const ordersCount = await this.orderRepository.count({
      where: { ...orderDateFilter },
    });

    // Order status counts based on latest tracking status
    const statusQuery = this.orderTrackingRepository
      .createQueryBuilder('tracking')
      .select('tracking.status', 'status')
      .addSelect('COUNT(DISTINCT tracking.orderId)', 'count')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(ot.createdAt)')
          .from(OrderTracking, 'ot')
          .where('ot.orderId = tracking.orderId');

        if (start && end) {
          subQuery.andWhere('ot.createdAt BETWEEN :start AND :end');
        }

        return 'tracking.createdAt = ' + subQuery.getQuery();
      });

    if (start && end) {
      statusQuery.setParameters({ start, end });
    }

    const rawStatusCounts = await statusQuery
      .groupBy('tracking.status')
      .getRawMany();

    const statusCountMap = rawStatusCounts.reduce(
      (acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );

    const pendingOrdersCount =
      (statusCountMap[TrackingStatus.PENDING] || 0) +
      (statusCountMap[TrackingStatus.ACCEPTED] || 0);

    const inProgressOrdersCount =
      (statusCountMap[TrackingStatus.PICKED_UP] || 0) +
      (statusCountMap[TrackingStatus.TRANSIT] || 0);

    // Completed orders = DELIVERED only (explicitly excluding CANCELLED)
    const completedOrdersCount = statusCountMap[TrackingStatus.DELIVERED] || 0;

    // Total Delivery Fee (only include orders where the rider was paid)
    const query = this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.deliveryFee)', 'totalDeliveryFee')
      .where('order.hasRewardedRider = true');

    if (start && end) {
      query.andWhere('order.createdAt BETWEEN :start AND :end', { start, end });
    }

    // Restrict to orders where the rider was paid

    const { totalDeliveryFee } = await query.getRawOne();

    return StandardResponse.ok(
      {
        usersCount,
        riders: {
          approved: approvedRidersCount,
          unapproved: unapprovedRidersCount,
        },
        ordersCount,
        ordersStatus: {
          pending: pendingOrdersCount,
          inProgress: inProgressOrdersCount,
          completed: completedOrdersCount,
        },
        totalDeliveryFee: parseFloat(totalDeliveryFee || '0'),
      },
      'Analytics retrieved successfully',
    );
  }

  /**
   * Get riders revenue
   */
  async getRiderRevenue(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoin('order.rider', 'rider')
      .select([
        'rider.id AS "riderId"',
        'rider.firstName AS "firstName"',
        'rider.lastName AS "lastName"',
        'COUNT(order.id) AS "ordersFulfilled"',
        'SUM(order.deliveryFee) AS "totalEarnings"',
      ])
      .where('order.riderId IS NOT NULL');

    if (start && end) {
      query.andWhere('order.createdAt BETWEEN :start AND :end', { start, end });
    }

    query.groupBy('rider.id, rider.firstName, rider.lastName');

    const result = await query.getRawMany();

    return StandardResponse.ok(result, 'Rider revenue retrieved successfully');
  }

  /**
   * Get pending orders (assigned and unassigned)
   */
  async getPendingOrders(page: number = 1, limit: number = 50) {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.rider', 'rider')
      .leftJoinAndSelect('order.orderTracking', 'tracking')
      .select([
        'order.id',
        'order.pickUpLocation',
        'order.dropOffLocation',
        'order.sender',
        'order.recipient',
        'order.userOrderRole',
        'order.vehicleType',
        'order.noteForRider',
        'order.serviceChargeAmount',
        'order.deliveryFee',
        'order.totalAmount',
        'order.eta',
        'order.createdAt',
        'order.updatedAt',
        'order.riderAssigned',
        'order.riderAssignedAt',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.mobile',
        'rider.id',
        'rider.firstName',
        'rider.lastName',
        'rider.email',
        'rider.mobile',
        'tracking.id',
        'tracking.status',
        'tracking.createdAt',
        'tracking.location',
      ])
      .orderBy('order.createdAt', 'DESC');

    // Filter for PENDING or ACCEPTED status
    queryBuilder
      .innerJoin(
        (qb) =>
          qb
            .select('ot.orderId', 'order_id')
            .addSelect('MAX(ot.createdAt)', 'max_created_at')
            .from(OrderTracking, 'ot')
            .groupBy('ot.orderId'),
        'latest_tracking',
        'latest_tracking.order_id = order.id',
      )
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('tracking2.status')
          .from(OrderTracking, 'tracking2')
          .where('tracking2.orderId = order.id')
          .andWhere('tracking2.createdAt = latest_tracking.max_created_at')
          .getQuery();
        return `${subQuery} IN (:...statuses)`;
      })
      .setParameter('statuses', [
        TrackingStatus.PENDING,
        TrackingStatus.ACCEPTED,
      ]);

    // Pagination
    const skip = (page - 1) * limit;
    const [orders, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return StandardResponse.ok(
      {
        orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Pending orders retrieved successfully',
    );
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: [
        'user',
        'rider',
        'orderTracking',
        'deliveryDestinations',
        'transactions',
      ],
    });

    if (!order) {
      throw new BadRequestException(StandardResponse.fail('Order not found'));
    }

    return StandardResponse.ok(order, 'Order details retrieved successfully');
  }
}

// Import for MoreThanOrEqual
import { MoreThanOrEqual } from 'typeorm';
import { Roles } from 'src/auth/roles.decorator';
