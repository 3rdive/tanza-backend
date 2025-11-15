# Tanza Backend - Agent Documentation

## Project Overview

Tanza Backend is a NestJS-based API server for a delivery/logistics platform. The application manages orders, riders, users, notifications, payments, and various other delivery-related operations.

## Tech Stack

- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Real-time**: WebSockets (Socket.IO)
- **Authentication**: JWT
- **Notifications**: Twilio (SMS), Push Notifications
- **Architecture**: CQRS Pattern (Command Query Responsibility Segregation)

## Project Structure

### Core Modules

- **`/src/order`**: Order management including creation, tracking, and multiple delivery/pickup support
- **`/src/users`**: User management, authentication, and profiles
- **`/src/auth`**: Authentication, authorization, role-based access control (RBAC)
- **`/src/notification`**: Push notifications and event-driven notification system
- **`/src/wallet`**: Wallet and payment management
- **`/src/task`**: Task creation and management for riders
- **`/src/otp`**: OTP generation, validation, and consumption
- **`/src/location`**: Location services and geospatial operations
- **`/src/storage-media`**: File upload and media storage
- **`/src/admin`**: Administrative operations and management
- **`/src/user-ratings`**: User rating and review system

### Key Features

1. **Multiple Pickup/Delivery Support**: Orders can have multiple pickup and delivery locations
2. **Real-time Updates**: WebSocket gateway for live rider tracking and order updates
3. **Event-Driven Architecture**: Uses CQRS with event handlers for async operations
4. **Role-Based Access**: Guards and decorators for role-based authorization
5. **Standardized Responses**: Response interceptor for consistent API responses

### Common Patterns

- **DTOs**: Data Transfer Objects in `/dto` folders for validation
- **Entities**: TypeORM entities in `/entities` folders
- **Event Handlers**: CQRS event handlers (e.g., `create-notification-event.handler.ts`)
- **Guards**: Auth guards, role guards for route protection
- **Interceptors**: Response transformation and standardization
- **Middleware**: Context middleware for request tracking

## Development Commands

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run start:dev

# Build for production
npm run build

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Lint and format
npm run lint
npm run format
```

## Database

- Database migrations in `/migrations` folder
- TypeORM entities define the schema
- PostgreSQL as the primary database

## API Documentation

- Bank API integration details in `BANK_API_DOCUMENTATION.md`
- Multiple pickup feature docs in `MULTIPLE_PICKUP_FEATURE.md` and `MULTIPLE_PICKUP_API_EXAMPLES.md`
- Order creation guide in `CREATE_ORDER_MULTIPLE_DELIVERY_GUIDE.md`

## Key Files

- **`main.ts`**: Application entry point
- **`app.module.ts`**: Root module
- **`constants.ts`**: Application constants
- **`on-startup.ts`**: Startup initialization logic

## Code Conventions

- Use TypeScript strict mode
- Follow NestJS module/service/controller pattern
- Use dependency injection
- Implement proper error handling with exceptions
- Use class-validator for DTO validation
- Use class-transformer for data transformation

## Testing

- Unit tests co-located with source files (`.spec.ts`)
- E2E tests in `/test` directory
- Example: `order.controller-multiple-delivery.spec.ts`

## WebSockets

- `riders.gateway.ts` handles real-time rider connections
- Used for live tracking and status updates

## Notes for AI Agents

- This is an active delivery platform backend
- Always consider multi-tenancy and data isolation when making changes
- Security is critical - maintain proper auth guards
- Performance matters - optimize database queries
- Follow existing patterns for consistency
- Consider backward compatibility with mobile clients
