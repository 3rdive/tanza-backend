import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Order } from '../order/entities/order.entity';
import { OrderTracking } from '../order/entities/order-tracking.entity';
import { Wallets } from '../wallet/entities/wallet.entity';
import { Transactions } from '../wallet/entities/transaction.entity';
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
  ) {}

  /**
   * Get all users with optional role filter
   */
  async getAllUsers(role?: Role) {
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

    const users = await queryBuilder.getMany();

    return StandardResponse.ok(
      {
        users,
        count: users.length,
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
              .select('ot.orderId', 'orderId')
              .addSelect('MAX(ot.createdAt)', 'maxCreatedAt')
              .from(OrderTracking, 'ot')
              .groupBy('ot.orderId'),
          'latestTracking',
          'latestTracking.orderId = order.id',
        )
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('tracking2.status')
            .from(OrderTracking, 'tracking2')
            .where('tracking2.orderId = order.id')
            .andWhere('tracking2.createdAt = latestTracking.maxCreatedAt')
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
}

// Import for MoreThanOrEqual
import { MoreThanOrEqual } from 'typeorm';
