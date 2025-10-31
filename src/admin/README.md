# Admin Module

This module provides administrative endpoints for managing users, orders, and viewing system statistics.

## Endpoints

All endpoints require Admin role authentication.

### 1. Get All Users
**GET** `/api/v1/admin/users`

Get all users in the system with optional role filtering.

**Query Parameters:**
- `role` (optional): Filter users by role (`user`, `admin`, `rider`)

**Example:**
```bash
# Get all users
GET /api/v1/admin/users

# Get only admin users
GET /api/v1/admin/users?role=admin

# Get only riders
GET /api/v1/admin/users?role=rider
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "mobile": "+2348012345678",
        "firstName": "John",
        "lastName": "Doe",
        "role": "user",
        "profilePic": "url",
        "countryCode": "+234",
        "registrationDate": "2025-10-28T10:00:00Z",
        "updatedAt": "2025-10-28T10:00:00Z",
        "registrationMode": "manual"
      }
    ],
    "count": 100
  }
}
```

---

### 2. Register New Admin
**POST** `/api/v1/admin/register`

Register a new admin user in the system.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "mobile": "+2348012345678",
  "firstName": "Admin",
  "lastName": "User",
  "password": "securePassword123",
  "countryCode": "+234"
}
```

**Validation:**
- `email`: Optional, must be valid email format
- `mobile`: Required, must be unique
- `firstName`: Required
- `lastName`: Required
- `password`: Required, minimum 6 characters
- `countryCode`: Optional, defaults to +234

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Admin registered successfully",
    "admin": {
      "id": "uuid",
      "email": "admin@example.com",
      "mobile": "+2348012345678",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "countryCode": "+234",
      "registrationDate": "2025-10-28T10:00:00Z"
    }
  }
}
```

---

### 3. Get Statistics
**GET** `/api/v1/admin/statistics`

Get comprehensive statistical data for the admin dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1000,
      "byRole": [
        { "role": "user", "count": "850" },
        { "role": "rider", "count": "100" },
        { "role": "admin", "count": "50" }
      ],
      "recentSevenDays": 45
    },
    "orders": {
      "total": 5000,
      "byStatus": [
        { "status": "pending", "count": "150" },
        { "status": "accepted", "count": "100" },
        { "status": "picked_up", "count": "50" },
        { "status": "delivered", "count": "4500" },
        { "status": "cancelled", "count": "200" }
      ],
      "recentSevenDays": 250
    },
    "revenue": {
      "total": 25000000.50
    },
    "wallets": {
      "total": 1000,
      "totalBalance": 5000000.00
    }
  }
}
```

**Statistics Included:**
- **Users**: Total count, breakdown by role, recent registrations (last 7 days)
- **Orders**: Total count, breakdown by status, recent orders (last 7 days)
- **Revenue**: Total revenue from all orders
- **Wallets**: Total wallet count and combined balance

---

### 4. Get All Orders
**GET** `/api/v1/admin/orders`

Get all orders with optional status filtering and pagination.

**Query Parameters:**
- `status` (optional): Filter orders by tracking status (`pending`, `accepted`, `picked_up`, `delivered`, `cancelled`)
- `page` (optional): Page number, defaults to 1
- `limit` (optional): Items per page, defaults to 50

**Examples:**
```bash
# Get all orders (first page)
GET /api/v1/admin/orders

# Get pending orders
GET /api/v1/admin/orders?status=pending

# Get delivered orders with pagination
GET /api/v1/admin/orders?status=delivered&page=2&limit=100

# Get cancelled orders
GET /api/v1/admin/orders?status=cancelled
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "pickUpLocation": {...},
        "dropOffLocation": {...},
        "sender": {...},
        "recipient": {...},
        "userOrderRole": "sender",
        "vehicleType": "bike",
        "noteForRider": "Handle with care",
        "serviceChargeAmount": 100,
        "deliveryFee": 500,
        "totalAmount": 600,
        "eta": "30 mins",
        "createdAt": "2025-10-28T10:00:00Z",
        "updatedAt": "2025-10-28T10:30:00Z",
        "riderAssigned": true,
        "riderAssignedAt": "2025-10-28T10:05:00Z",
        "user": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "mobile": "+2348012345678"
        },
        "rider": {
          "id": "uuid",
          "firstName": "Rider",
          "lastName": "Name",
          "email": "rider@example.com",
          "mobile": "+2348087654321"
        },
        "orderTracking": [...]
      }
    ],
    "pagination": {
      "total": 5000,
      "page": 1,
      "limit": 50,
      "totalPages": 100
    }
  }
}
```

---

## Order Status Values

The following status values can be used for filtering orders:

- `pending` - Order created, waiting for rider acceptance
- `accepted` - Rider accepted the order
- `picked_up` - Rider picked up the item
- `delivered` - Order successfully delivered
- `cancelled` - Order was cancelled

---

## Authentication

All endpoints require authentication with Admin role. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Email already exists"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

