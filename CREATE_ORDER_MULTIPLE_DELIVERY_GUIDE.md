# Multiple Delivery Order - Implementation Guide

## Overview

The multiple delivery order feature has been refactored into a dedicated use case that allows users to create orders with one pickup location and multiple delivery destinations.

## Architecture Changes

### 1. New Entity: DeliveryDestination

Located at: `src/order/entities/delivery-destination.entity.ts`

This entity stores individual delivery location details:

```typescript
{
  id: string;
  orderId: string;
  dropOffLocation: OrderLocation;
  recipient: UserInfo;
  distanceFromPickupKm: number;
  durationFromPickup: string;
  deliveryFee: number;
  delivered: boolean;
  deliveredAt: Date;
}
```

### 2. Updated Order Entity

Added fields to support multiple deliveries:

- `deliveryDestinations`: OneToMany relationship with DeliveryDestination
- `hasMultipleDeliveries`: Boolean flag to indicate if order has multiple drops

### 3. New Use Case: CreateOrderUsecase

Located at: `src/order/usecasses/create-order.usecase.ts`

Handles the creation of multiple delivery orders with:

- Fee calculation using the multiple delivery charge calculation
- Wallet balance validation
- Atomic transaction handling
- Automatic rider assignment trigger

### 4. New DTO: CreateMultipleDeliveryOrderDto

Located at: `src/order/dto/create-multiple-delivery-order.dto.ts`

Request structure:

```typescript
{
  sender: PartyInfoDto;
  pickUpAddress: string;
  pickUpCoordinates: [number, number]; //[longitude , latitude]
  deliveryLocations: DeliveryLocationDto[];
  userOrderRole: UserOrderRole;
  vehicleType: VehicleType;
  noteForRider?: string;
  isUrgent?: boolean;
}
```

## API Endpoint

### Create Multiple Delivery Order

**Endpoint:** `POST /orders/multiple-delivery`

**Authentication:** Required (JWT Bearer token)

**Request Body:**

```json
{
  "sender": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890"
  },
  "pickUpAddress": "123 Main Street, Lagos",
  "pickUpCoordinates": [3.1319, 6.5244],
  "deliveryLocations": [
    {
      "address": "456 Oak Avenue, Lagos",
      "coordinates": [3.1401, 6.5186],
      "recipient": {
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "0987654321"
      }
    },
    {
      "address": "789 Pine Road, Lagos",
      "coordinates": [3.1285, 6.5349],
      "recipient": {
        "name": "Bob Johnson",
        "email": "bob@example.com",
        "phone": "5555555555"
      }
    }
  ],
  "userOrderRole": "sender",
  "vehicleType": "bike",
  "noteForRider": "Handle with care",
  "isUrgent": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Multiple delivery order created successfully",
  "data": {
    "id": "uuid",
    "userId": "user-id",
    "sender": {...},
    "recipient": {...},
    "pickUpLocation": {...},
    "dropOffLocation": {...},
    "totalAmount": 2000,
    "deliveryFee": 1800,
    "serviceChargeAmount": 200,
    "distanceInKm": 6.4,
    "eta": "20 minutes",
    "isUrgent": false,
    "hasMultipleDeliveries": true,
    "createdAt": "2025-11-15T...",
    "updatedAt": "2025-11-15T..."
  }
}
```

## Database Schema Changes

### Migration Required

You'll need to create a migration to add:

1. **delivery_destination** table
2. **hasMultipleDeliveries** column to **order** table

Example migration:

```sql
-- Create delivery_destination table
CREATE TABLE delivery_destination (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId" UUID NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  "dropOffLocation" JSONB NOT NULL,
  recipient JSONB NOT NULL,
  "distanceFromPickupKm" DECIMAL(10,4) NOT NULL,
  "durationFromPickup" VARCHAR NOT NULL,
  "deliveryFee" DECIMAL(10,2) NOT NULL,
  delivered BOOLEAN DEFAULT FALSE,
  "deliveredAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Add hasMultipleDeliveries to order table
ALTER TABLE "order"
ADD COLUMN "hasMultipleDeliveries" BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX idx_delivery_destination_order
ON delivery_destination("orderId");
```

## Business Logic

### Pricing Calculation

1. **Vehicle Type Selection**: Determined by the maximum distance from pickup to any delivery location
   - Bike: All deliveries ≤ 5km
   - Van: Any delivery > 5km

2. **Fee Structure**:
   - Individual delivery fees calculated for each destination
   - Total delivery fee = Sum of all individual fees
   - Service charge applied to total delivery fee
   - Urgency fee (500) added if order is urgent

### Transaction Flow

1. Calculate delivery charges for all destinations
2. Validate wallet balance
3. Begin database transaction
4. Create order record
5. Create delivery destination records
6. Deduct amount from wallet
7. Create order tracking entry
8. Commit transaction
9. Publish transaction event
10. Trigger rider assignment

### Error Handling

- **Insufficient Balance**: Transaction fails before any DB writes
- **Database Errors**: Full rollback via transaction
- **Calculation Errors**: Propagated to client with proper error messages

## Testing

### Unit Tests

Located at: `src/order/usecasses/create-order.usecase.spec.ts`

Coverage includes:

- ✅ Successful order creation with multiple deliveries
- ✅ Insufficient balance validation
- ✅ Proper fee calculation
- ✅ Correct delivery destination creation

Run tests:

```bash
npm test -- --testPathPattern=create-order.usecase.spec.ts
```

## Integration with Existing Code

### Backward Compatibility

The original `createOrder` method in `OrderService` remains unchanged for single delivery orders. The new use case is specifically for multiple deliveries.

### Rider Assignment

After order creation, the existing `assignRiderToOrder` method is called automatically (to be integrated).

### Order Tracking

Uses the existing `OrderTracking` entity and workflow.

## Future Enhancements

1. **Route Optimization**: Calculate optimal delivery sequence
2. **Batch Discounts**: Apply discounts for multiple deliveries
3. **Individual Tracking**: Track delivery status per destination
4. **Delivery Sequence**: Allow users to specify delivery order
5. **Partial Delivery**: Support marking individual destinations as delivered

## Example Usage

### Frontend Integration (React/Vue)

```javascript
const createMultipleDeliveryOrder = async (orderData) => {
  try {
    const response = await fetch('/orders/multiple-delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (result.success) {
      console.log('Order created:', result.data);
      // Navigate to order tracking page
      router.push(`/orders/${result.data.id}`);
    } else {
      console.error('Order creation failed:', result.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

### Mobile Integration (React Native)

```javascript
import axios from 'axios';

const createOrder = async (orderDetails) => {
  try {
    const { data } = await axios.post(
      '/orders/multiple-delivery',
      orderDetails,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return data;
  } catch (error) {
    if (error.response?.data?.message === 'insufficient balance') {
      Alert.alert('Insufficient Balance', 'Please top up your wallet');
    }
    throw error;
  }
};
```

## Support & Troubleshooting

### Common Issues

**Issue**: Order creation fails with "insufficient balance"
**Solution**: Check wallet balance and top up if needed

**Issue**: Coordinates not accepted
**Solution**: Ensure coordinates are in [longitude, latitude] format

**Issue**: Delivery destinations not created
**Solution**: Check database transaction logs and ensure all required fields are provided

### Logging

The use case includes detailed logging:

- Order creation attempts
- Transaction failures
- Calculation results

Check application logs for debugging:

```bash
tail -f logs/application.log | grep CreateOrderUsecase
```
