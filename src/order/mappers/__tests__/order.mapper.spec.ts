import { OrderMapper } from '../order.mapper';
import { Order } from '../../entities/order.entity';
import { DeliveryDestination } from '../../entities/delivery-destination.entity';
import { OrderTracking } from '../../entities/order-tracking.entity';
import { TrackingStatus } from '../../entities/tracking-status.enum';

describe('OrderMapper', () => {
  describe('mapOrderToPreview', () => {
    it('maps single-delivery order to OrderPreview correctly', () => {
      const order: Partial<Order> = {
        id: 'order-1',
        orderTracking: [
          {
            id: 't1',
            status: TrackingStatus.PENDING,
            createdAt: new Date('2025-01-01T10:00:00Z'),
          } as Partial<OrderTracking>,
        ],
        pickUpLocation: { address: 'Pickup Address' } as any,
        dropOffLocation: { address: 'Dropoff Address' } as any,
        userOrderRole: 'SENDER' as any,
        deliveryFee: 500,
        updatedAt: new Date('2025-01-01T11:00:00Z'),
        eta: '15 minutes',
        hasRewardedRider: false,
        hasMultipleDeliveries: false,
      } as unknown as Order;

      const preview = OrderMapper.mapOrderToPreview(order as unknown as Order);

      expect(preview.id).toBe(order.id);
      expect(preview.pickUpLocationAddress).toBe('Pickup Address');
      expect(preview.dropOffLocationAddress).toBe('Dropoff Address');
      expect(preview.deliveryFee).toBe(500);
      expect(preview.eta).toBe('15 minutes');
      expect(preview.hasMultipleDeliveries).toBe(false);
    });

    it('prefers first delivery destination address for preview when multiple deliveries exist', () => {
      const order: Partial<Order> = {
        id: 'order-2',
        orderTracking: [
          {
            id: 't1',
            status: TrackingStatus.PENDING,
            createdAt: new Date(),
          } as Partial<OrderTracking>,
        ],
        pickUpLocation: { address: 'Pickup Address' } as any,
        // order.dropOffLocation may be legacy/empty when using multiple destinations
        dropOffLocation: { address: 'Legacy Dropoff' } as any,
        deliveryFee: 1200,
        updatedAt: new Date(),
        eta: '30 minutes',
        hasRewardedRider: true,
        hasMultipleDeliveries: true,
        deliveryDestinations: [
          {
            id: 'd1',
            dropOffLocation: { address: 'First Dest Address' } as any,
            recipient: { name: 'Jane' } as any,
            distanceFromPickupKm: 2.3,
            durationFromPickup: '8 minutes',
            deliveryFee: 460,
            delivered: false,
            createdAt: new Date(),
          } as DeliveryDestination,
          {
            id: 'd2',
            dropOffLocation: { address: 'Second Dest Address' } as any,
            recipient: { name: 'Bob' } as any,
            distanceFromPickupKm: 4.1,
            durationFromPickup: '12 minutes',
            deliveryFee: 820,
            delivered: false,
            createdAt: new Date(),
          } as DeliveryDestination,
        ],
      } as unknown as Order;

      const preview = OrderMapper.mapOrderToPreview(order as unknown as Order);

      expect(preview.pickUpLocationAddress).toBe('Pickup Address');
      // should pick first destination address
      expect(preview.dropOffLocationAddress).toBe('First Dest Address');
      expect(preview.deliveryFee).toBe(1200);
      expect(preview.hasMultipleDeliveries).toBe(true);
    });
  });

  describe('mapToActiveOrder', () => {
    it('maps single-delivery order to ActiveOrder with no deliveryDestinations', () => {
      const order: Partial<Order> = {
        id: 'order-3',
        userId: 'user-1',
        noteForRider: 'Please handle carefully',
        deliveryFee: 700,
        user: {
          firstName: 'John',
          lastName: 'Doe',
          mobile: '0800000000',
          profilePic: 'url',
        } as any,
        sender: { name: 'John Doe', phone: '0800000000' } as any,
        pickUpLocation: {
          longitude: '3.13',
          latitude: '6.52',
          address: 'Pickup X',
        } as any,
        dropOffLocation: {
          longitude: '3.14',
          latitude: '6.51',
          address: 'Dropoff X',
        } as any,
        orderTracking: [
          {
            id: 't1',
            status: TrackingStatus.ACCEPTED,
            createdAt: new Date('2025-01-02T10:00:00Z'),
          } as Partial<OrderTracking>,
          {
            id: 't2',
            status: TrackingStatus.PICKED_UP,
            createdAt: new Date('2025-01-02T10:05:00Z'),
          } as Partial<OrderTracking>,
        ] as any[],
        eta: '10 minutes',
        createdAt: new Date('2025-01-02T10:00:00Z'),
        hasMultipleDeliveries: false,
      } as unknown as Order;

      const active = OrderMapper.mapToActiveOrder(order as unknown as Order);

      expect(active.orderId).toBe(order.id);
      expect(active.userId).toBe(order.userId);
      expect(active.note).toBe('Please handle carefully');
      expect(active.amount).toBe(700);
      expect(active.userFullName).toContain('John Doe');
      expect(active.userMobileNumber).toBe('0800000000');
      // dropOffLocation should be the order.dropOffLocation for single delivery
      expect(active.dropOffLocation).toEqual(order.dropOffLocation);
      expect(active.hasMultipleDeliveries).toBe(false);
      expect(Array.isArray(active.deliveryDestinations)).toBe(true);
      expect(active.deliveryDestinations!.length).toBe(0);
      // orderTracking should be sorted by createdAt ascending in mapper output
      expect(active.orderTracking.length).toBe(2);
      expect(active.orderTracking[0].status).toBe(TrackingStatus.ACCEPTED);
    });

    it('maps multiple-delivery order to ActiveOrder including destinations and representative dropOffLocation', () => {
      const dest1: Partial<DeliveryDestination> = {
        id: 'dest-1',
        dropOffLocation: {
          longitude: '3.1401',
          latitude: '6.5186',
          address: 'Dest 1',
        } as any,
        recipient: { name: 'Jane', phone: '098' } as any,
        distanceFromPickupKm: 2.3,
        durationFromPickup: '8 minutes',
        deliveryFee: 460,
        delivered: false,
        createdAt: new Date('2025-02-01T08:00:00Z'),
      };

      const dest2: Partial<DeliveryDestination> = {
        id: 'dest-2',
        dropOffLocation: {
          longitude: '3.1285',
          latitude: '6.5349',
          address: 'Dest 2',
        } as any,
        recipient: { name: 'Bob', phone: '555' } as any,
        distanceFromPickupKm: 4.1,
        durationFromPickup: '12 minutes',
        deliveryFee: 820,
        delivered: false,
        createdAt: new Date('2025-02-01T08:05:00Z'),
      };

      const order: Partial<Order> = {
        id: 'order-4',
        userId: 'user-2',
        noteForRider: 'Multiple drops',
        deliveryFee: 1280,
        user: {
          firstName: 'Alice',
          lastName: 'Smith',
          mobile: '0900000000',
        } as any,
        sender: { name: 'Alice', phone: '0900000000' } as any,
        pickUpLocation: {
          longitude: '3.1319',
          latitude: '6.5244',
          address: 'Origin',
        } as any,
        // legacy dropOffLocation left present but mapper should prefer first delivery destination for representative dropoff
        dropOffLocation: {
          longitude: '0',
          latitude: '0',
          address: 'Legacy',
        } as any,
        orderTracking: [
          {
            id: 't1',
            status: TrackingStatus.ACCEPTED,
            createdAt: new Date('2025-02-01T08:00:00Z'),
          } as any,
        ],
        eta: '20 minutes',
        createdAt: new Date(),
        hasMultipleDeliveries: true,
        deliveryDestinations: [
          dest1 as DeliveryDestination,
          dest2 as DeliveryDestination,
        ],
      } as unknown as Order;

      const active = OrderMapper.mapToActiveOrder(order as unknown as Order);

      // representative dropOffLocation should be first destination
      expect(active.dropOffLocation).toEqual(dest1.dropOffLocation);
      expect(active.hasMultipleDeliveries).toBe(true);
      expect(active.deliveryDestinations!.length).toBe(2);
      expect(active.deliveryDestinations![0].id).toBe('dest-1');
      expect(active.deliveryDestinations![0].dropOffLocation.address).toBe(
        'Dest 1',
      );
      expect(active.deliveryDestinations![1].dropOffLocation.address).toBe(
        'Dest 2',
      );
    });
  });

  describe('mapToAssignedOrder', () => {
    it('maps assigned order and includes multiple delivery summary fields', () => {
      const dest: Partial<DeliveryDestination> = {
        id: 'dest-x',
        dropOffLocation: {
          longitude: '3.1401',
          latitude: '6.5186',
          address: 'Assigned Dest',
        } as any,
        recipient: { name: 'Sam', phone: '090' } as any,
        distanceFromPickupKm: 3,
        durationFromPickup: '10 minutes',
        deliveryFee: 900,
        delivered: false,
        createdAt: new Date(),
      };

      const order: Partial<Order> = {
        id: 'order-5',
        userId: 'user-3',
        user: { firstName: 'Rider', lastName: 'One', mobile: '081' } as any,
        sender: { name: 'User', phone: '081' } as any,
        pickUpLocation: {
          longitude: '3.1319',
          latitude: '6.5244',
          address: 'Pickup',
        } as any,
        dropOffLocation: {
          longitude: '3.1401',
          latitude: '6.5186',
          address: 'Dropoff',
        } as any,
        eta: '12 minutes',
        distanceInKm: 3.0,
        isUrgent: false,
        totalAmount: 900,
        hasMultipleDeliveries: true,
        deliveryDestinations: [dest as DeliveryDestination],
      } as unknown as Order;

      const assigned = OrderMapper.mapToAssignedOrder(
        order as unknown as Order,
      );

      // representative dropOffLocation should be first destination when hasMultipleDeliveries
      expect(assigned.dropOffLocation).toEqual(dest.dropOffLocation);
      expect(assigned.distanceInKm).toBe(3.0);
      expect(assigned.isUrgent).toBe(false);
      expect(assigned.amount).toBe(900);
      expect(assigned.hasMultipleDeliveries).toBe(true);
      expect(Array.isArray(assigned.deliveryDestinations)).toBe(true);
      expect(assigned.deliveryDestinations!.length).toBe(1);
      expect(assigned.deliveryDestinations![0].id).toBe('dest-x');
    });
  });
});
