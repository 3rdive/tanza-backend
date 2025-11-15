# Multiple Delivery Feature

## Overview

This feature allows for one pickup location with multiple delivery destinations. It's useful for scenarios where a single rider/driver picks up multiple items from one location and delivers them to different addresses.

## How it works

### Single Delivery (Original)

- One pickup location → One delivery location
- Simple distance calculation
- Vehicle type determined by single distance

### Multiple Delivery (New)

- One pickup location → Multiple delivery locations
- Distance calculated from pickup to each delivery location
- Vehicle type determined by the maximum distance from pickup to any delivery location
- Total delivery fee is the sum of individual delivery fees
- Service charge applied to total delivery fee

## Pricing Logic

### Vehicle Selection

- **Bike**: Used when maximum distance from pickup to any delivery ≤ 5km
- **Van**: Used when maximum distance from pickup to any delivery > 5km

### Fee Calculation

1. Calculate distance from pickup to each delivery location
2. Apply appropriate rate per km (bike or van) based on maximum distance
3. Sum all individual delivery fees
4. Add urgency fee if applicable (applied to total)
5. Calculate service charge on total delivery fee
6. Return total amount = delivery fees + service charge

## API Usage

### Single Delivery

```typescript
calculateDeliveryFee(
  start: [number, number], // [lon, lat]
  end: [number, number],   // [lon, lat]
  isUrgent: boolean,
  urgencyFee: number
): Promise<DeliveryFeeResult>
```

### Multiple Delivery

```typescript
calculateMultipleDeliveryFee(
  pickupLocation: [number, number],      // [lon, lat]
  deliveryLocations: [number, number][], // Array of [lon, lat]
  isUrgent: boolean,
  urgencyFee: number
): Promise<MultipleDeliveryFeeResult>
```

## Response Structure

### MultipleDeliveryFeeResult

```typescript
{
  totalAmount: number;           // Total cost including service charge
  totalDeliveryFee: number;      // Sum of all delivery fees
  serviceCharge: number;         // Service charge amount
  pickupLocation: [number, number];
  deliveries: SingleDeliveryLeg[];  // Individual delivery details
  totalDistanceKm: number;       // Sum of all distances
  estimatedTotalDuration: string; // Estimated time for all deliveries
  vehicleType: 'bike' | 'van';   // Vehicle type used for pricing
}
```

### SingleDeliveryLeg

```typescript
{
  deliveryLocation: [number, number];
  distance_from_pickup_km: number;
  duration_from_pickup: string;
  deliveryFee: number;
}
```

## Configuration Variables

- `RIDER_RATE_PER_KM`: Rate per kilometer for bike deliveries
- `DRIVER_RATE_PER_KM`: Rate per kilometer for van deliveries
- `SERVICE_CHARGE_PERCENT`: Service charge percentage applied to total delivery fee

## Future Enhancements

- Optimize routing to calculate the most efficient delivery sequence
- Consider travel time between delivery locations (currently only pickup→delivery is calculated)
- Add support for different pricing zones
- Implement bulk delivery discounts
