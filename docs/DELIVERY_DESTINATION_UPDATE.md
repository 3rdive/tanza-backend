# Delivery Destination Update Feature

## Overview
This feature allows riders to mark individual delivery destinations as delivered in multi-delivery orders, with automatic push notifications sent to the user who booked the order. It also prevents riders from marking the entire order as delivered until all delivery destinations have been completed.

## New Endpoint

### Mark Delivery Destination as Delivered
**Endpoint:** `POST /api/order/destination/delivered`

**Role Required:** `RIDER`

**Request Body:**
```json
{
  "orderId": "uuid-of-order",
  "destinationId": "uuid-of-delivery-destination"
}
```

**Success Response:**
```json
{
  "id": "destination-uuid",
  "orderId": "order-uuid",
  "dropOffLocation": {
    "latitude": "6.5244",
    "longitude": "3.3792",
    "address": "123 Main Street, Lagos"
  },
  "recipient": {
    "name": "John Doe",
    "phone": "08012345678"
  },
  "distanceFromPickupKm": 5.2,
  "durationFromPickup": "15 minutes",
  "deliveryFee": 1500,
  "delivered": true,
  "deliveredAt": "2024-01-15T10:30:00.000Z",
  "createdAt": "2024-01-15T09:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Delivery destination not found
- `400 Bad Request` - Delivery destination already marked as delivered
- `400 Bad Request` - Order not found

## Key Features

### 1. Individual Destination Tracking
- Each delivery destination in a multi-delivery order can be marked as delivered independently
- The `delivered` boolean flag is set to `true`
- The `deliveredAt` timestamp is recorded

### 2. Automatic Push Notifications
When a delivery destination is marked as delivered:
- **Push Notification** is sent to the user who booked the order
  - Title: "Delivery Completed"
  - Body: "Your package has been delivered to [recipient name or address]"
  - Data includes: orderId, destinationId, type: 'destination_delivered'

- **In-App Notification** is also created
  - Same title and message
  - Links to: `/orders/{orderId}`

### 3. Order-Level Delivery Validation
The `addOrderTracking` endpoint has been updated to prevent marking an order as `DELIVERED` if:
- The order has multiple deliveries (`hasMultipleDeliveries === true`)
- Not all delivery destinations have been marked as delivered

**Error Response Example:**
```json
{
  "success": false,
  "message": "cannot mark order as delivered. 2 delivery destination(s) have not been delivered yet"
}
```

## Implementation Details

### Modified Files

1. **`src/order/order.service.ts`**
   - Added `markDestinationDelivered()` method
   - Injected `DeliveryDestination` repository
   - Updated `addOrderTracking()` to validate all destinations are delivered before allowing DELIVERED status
   - Added imports for `SendPushNotificationEvent` and `MarkDestinationDeliveredDto`

2. **`src/order/order.controller.ts`**
   - Added new endpoint `POST /destination/delivered`
   - Restricted to `RIDER` role
   - Imported `MarkDestinationDeliveredDto`

3. **`src/order/dto/mark-destination-delivered.dto.ts`** (New File)
   - DTO for marking destination as delivered
   - Validates `orderId` and `destinationId` as required strings

### Database Schema
Uses existing `delivery_destination` table with columns:
- `id` (uuid)
- `orderId` (uuid)
- `dropOffLocation` (jsonb)
- `recipient` (jsonb)
- `distanceFromPickupKm` (decimal)
- `durationFromPickup` (string)
- `deliveryFee` (decimal)
- `delivered` (boolean, default: false)
- `deliveredAt` (timestamp, nullable)
- `createdAt` (timestamp)

## Usage Flow

### For Multi-Delivery Orders

1. Rider accepts the order and picks up the package(s)
2. Rider delivers to first destination:
   - Calls `POST /api/order/destination/delivered` with first destinationId
   - User receives notification: "Your package has been delivered to [First Recipient]"
3. Rider delivers to second destination:
   - Calls `POST /api/order/destination/delivered` with second destinationId
   - User receives notification: "Your package has been delivered to [Second Recipient]"
4. After all destinations are delivered:
   - Rider can now mark order as DELIVERED via `POST /api/order/tracking`
   - If attempted before all destinations delivered → Error with count of undelivered destinations

### For Single-Delivery Orders
- Single delivery orders work as before
- No need to mark individual destinations (array is empty)
- Can directly mark order as DELIVERED

## Testing Checklist

- [ ] Mark first destination as delivered - success
- [ ] Verify push notification sent to order creator
- [ ] Verify in-app notification created
- [ ] Try to mark already delivered destination - should fail
- [ ] Try to mark order as DELIVERED with undelivered destinations - should fail with count
- [ ] Mark all destinations as delivered, then mark order as DELIVERED - success
- [ ] Test with invalid orderId/destinationId - should fail appropriately
- [ ] Test notification failure doesn't break destination update
- [ ] Verify transaction rollback on errors

## Security Considerations

- Endpoint restricted to `RIDER` role only
- Should add additional validation to ensure the rider is assigned to this specific order (future enhancement)
- Uses database transactions to ensure data consistency

## Future Enhancements

1. Add rider validation to ensure only the assigned rider can mark destinations delivered
2. Add image/proof of delivery upload capability
3. Add recipient signature capture
4. Add delivery notes for each destination
5. Add real-time WebSocket notifications in addition to push notifications