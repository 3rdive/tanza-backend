# Multiple Delivery API Examples

## Example 1: Food Delivery from Restaurant to Multiple Customers

### Request

```json
{
  "pickupLocation": [3.1319, 6.5244], // Restaurant coordinates (Lagos)
  "deliveryLocations": [
    [3.1401, 6.5186], // Customer 1 address
    [3.1285, 6.5349], // Customer 2 address
    [3.1456, 6.5123] // Customer 3 address
  ],
  "isUrgent": false,
  "urgencyFee": 500
}
```

### Response

```json
{
  "totalAmount": 2650,
  "totalDeliveryFee": 2400,
  "serviceCharge": 250,
  "pickupLocation": [3.1319, 6.5244],
  "deliveries": [
    {
      "deliveryLocation": [3.1401, 6.5186],
      "distance_from_pickup_km": 2.3,
      "duration_from_pickup": "8 minutes",
      "deliveryFee": 460
    },
    {
      "deliveryLocation": [3.1285, 6.5349],
      "distance_from_pickup_km": 4.1,
      "duration_from_pickup": "12 minutes",
      "deliveryFee": 820
    },
    {
      "deliveryLocation": [3.1456, 6.5123],
      "distance_from_pickup_km": 5.8,
      "duration_from_pickup": "18 minutes",
      "deliveryFee": 1160
    }
  ],
  "totalDistanceKm": 12.2,
  "estimatedTotalDuration": "37 minutes",
  "vehicleType": "van"
}
```

## Example 2: Pharmacy Delivery (Urgent)

### Request

```json
{
  "pickupLocation": [3.15, 6.53], // Pharmacy coordinates
  "deliveryLocations": [
    [3.152, 6.532], // Patient 1 (0.8km)
    [3.148, 6.528] // Patient 2 (1.2km)
  ],
  "isUrgent": true,
  "urgencyFee": 1000
}
```

### Response

```json
{
  "totalAmount": 1500,
  "totalDeliveryFee": 1400,
  "serviceCharge": 100,
  "pickupLocation": [3.15, 6.53],
  "deliveries": [
    {
      "deliveryLocation": [3.152, 6.532],
      "distance_from_pickup_km": 0.8,
      "duration_from_pickup": "3 minutes",
      "deliveryFee": 160
    },
    {
      "deliveryLocation": [3.148, 6.528],
      "distance_from_pickup_km": 1.2,
      "duration_from_pickup": "4 minutes",
      "deliveryFee": 240
    }
  ],
  "totalDistanceKm": 2.0,
  "estimatedTotalDuration": "6 minutes",
  "vehicleType": "bike"
}
```

Note: Total delivery fee = (160 + 240) + 1000 (urgency fee) = 1400

## Example 3: Grocery Delivery to Multiple Locations

### Request

```json
{
  "pickupLocation": [3.12, 6.54], // Supermarket coordinates
  "deliveryLocations": [
    [3.11, 6.55], // Customer 1 (8.5km)
    [3.13, 6.53], // Customer 2 (3.2km)
    [3.125, 6.545], // Customer 3 (2.1km)
    [3.105, 6.535] // Customer 4 (7.8km)
  ],
  "isUrgent": false,
  "urgencyFee": 0
}
```

### Response

```json
{
  "totalAmount": 4530,
  "totalDeliveryFee": 4320,
  "serviceCharge": 210,
  "pickupLocation": [3.12, 6.54],
  "deliveries": [
    {
      "deliveryLocation": [3.11, 6.55],
      "distance_from_pickup_km": 8.5,
      "duration_from_pickup": "25 minutes",
      "deliveryFee": 1700
    },
    {
      "deliveryLocation": [3.13, 6.53],
      "distance_from_pickup_km": 3.2,
      "duration_from_pickup": "10 minutes",
      "deliveryFee": 640
    },
    {
      "deliveryLocation": [3.125, 6.545],
      "distance_from_pickup_km": 2.1,
      "duration_from_pickup": "7 minutes",
      "deliveryFee": 420
    },
    {
      "deliveryLocation": [3.105, 6.535],
      "distance_from_pickup_km": 7.8,
      "duration_from_pickup": "23 minutes",
      "deliveryFee": 1560
    }
  ],
  "totalDistanceKm": 21.6,
  "estimatedTotalDuration": "65 minutes",
  "vehicleType": "van"
}
```

Note: Van rate used because max distance (8.5km) > 5km threshold

## Error Cases

### No Delivery Locations

```json
{
  "pickupLocation": [3.1319, 6.5244],
  "deliveryLocations": [],
  "isUrgent": false,
  "urgencyFee": 0
}
```

Response:

```json
{
  "error": "At least one delivery location is required"
}
```

### Single Delivery Location

For single delivery, use the original `calculateDeliveryFee` method instead of the multiple delivery method for better performance.

## Integration with Order Controller

### Endpoint

```
POST /orders/calculate-multiple-delivery-charge
```

### Request Body

```typescript
{
  "pickupLocation": [number, number],      // [longitude, latitude]
  "deliveryLocations": [number, number][], // Array of [longitude, latitude]
  "isUrgent"?: boolean,                    // Optional, defaults to false
  "urgencyFee": number                     // Additional fee for urgent deliveries
}
```

### Response Body

```typescript
{
  "totalAmount": number,
  "totalDeliveryFee": number,
  "serviceCharge": number,
  "pickupLocation": [number, number],
  "deliveries": [
    {
      "deliveryLocation": [number, number],
      "distance_from_pickup_km": number,
      "duration_from_pickup": string,
      "deliveryFee": number
    }
  ],
  "totalDistanceKm": number,
  "estimatedTotalDuration": string,
  "vehicleType": "bike" | "van"
}
```

### cURL Example

```bash
curl -X POST http://localhost:3000/orders/calculate-multiple-delivery-charge \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": [3.1319, 6.5244],
    "deliveryLocations": [
      [3.1401, 6.5186],
      [3.1285, 6.5349],
      [3.1456, 6.5123]
    ],
    "isUrgent": false,
    "urgencyFee": 500
  }'
```

### JavaScript Fetch Example

```javascript
const response = await fetch('/orders/calculate-multiple-delivery-charge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    pickupLocation: [3.1319, 6.5244],
    deliveryLocations: [
      [3.1401, 6.5186],
      [3.1285, 6.5349],
      [3.1456, 6.5123],
    ],
    isUrgent: false,
    urgencyFee: 500,
  }),
});

const result = await response.json();
console.log('Multiple delivery calculation:', result);
```

```

```
