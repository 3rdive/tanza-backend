# Bank API Documentation

## Overview

Two new endpoints have been added to handle bank operations with Paystack integration.

## Endpoints

### 1. Search Banks (Autocomplete)

**GET** `/banks?query={searchTerm}`

Search through the local banks list for autocomplete functionality.

**Query Parameters:**

- `query` (optional): Search term to filter banks by name, code, or slug

**Example Request:**

```bash
curl http://localhost:3000/banks?query=guaranty
```

**Example Response:**

```json
[
  {
    "id": 9,
    "name": "Guaranty Trust Bank",
    "slug": "guaranty-trust-bank",
    "code": "058",
    "longcode": "058152052",
    "gateway": "emandate",
    "pay_with_bank": false,
    "supports_transfer": true,
    "available_for_direct_debit": true,
    "active": true,
    "country": "Nigeria",
    "currency": "NGN",
    "type": "nuban",
    "is_deleted": false,
    "createdAt": "2016-07-14T10:04:29.000Z",
    "updatedAt": "2024-07-18T08:37:54.000Z"
  }
]
```

**Notes:**

- If no query is provided, returns all active banks
- Searches by bank name, code, or slug
- Only returns active, non-deleted banks

---

### 2. Validate Account Number

**GET** `/banks/validate?account_number={number}&bank_code={code}`

Validate an account number and retrieve the account holder's name from Paystack.

**Query Parameters:**

- `account_number` (required): The customer's account number
- `bank_code` (required): Bank code from the banks list

**Example Request:**

```bash
curl 'http://localhost:3000/banks/validate?account_number=9153065907&bank_code=999992'
```

**Example Response:**

```json
{
  "account_number": "9153065907",
  "account_name": "SAMUEL BABATUNDE ABIODUN",
  "bank_id": 171
}
```

**Error Responses:**

400 Bad Request - Invalid account number or bank code:

```json
{
  "statusCode": 400,
  "message": "Invalid account number or bank code",
  "error": "Bad Request"
}
```

400 Bad Request - Paystack not configured:

```json
{
  "statusCode": 400,
  "message": "Payment service is not configured. Please contact support.",
  "error": "Bad Request"
}
```

---

## Environment Variables

Make sure `PAYSTACK_SECRET_KEY` is set in your `.env` file:

```env
PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here
```

---

## Implementation Details

### Files Created:

- `src/bank/bank.module.ts` - Module definition
- `src/bank/bank.service.ts` - Business logic
- `src/bank/bank.controller.ts` - API endpoints
- `src/bank/dto/search-banks.dto.ts` - Search request DTO
- `src/bank/dto/validate-account.dto.ts` - Validation request DTO
- `src/bank/dto/bank-response.dto.ts` - Response DTOs

### Key Features:

1. **Local Bank Search**: Fast, offline search using the `banks.json` file
2. **Paystack Integration**: Real-time account validation via Paystack API
3. **Error Handling**: Comprehensive error handling for Paystack API calls
4. **Validation**: Input validation using class-validator
5. **Timeout Protection**: 10-second timeout on Paystack API calls
6. **Type Safety**: Full TypeScript support with proper typing

### Configuration Changes:

- Updated `tsconfig.json` to enable `resolveJsonModule` and `esModuleInterop`
- Added `BankModule` to `AppModule` imports

---

## Testing

### Test Bank Search:

```bash
# Search all banks
curl http://localhost:3000/banks

# Search by name
curl http://localhost:3000/banks?query=access

# Search by code
curl http://localhost:3000/banks?query=044
```

### Test Account Validation:

```bash
curl 'http://localhost:3000/banks/validate?account_number=0022728151&bank_code=063'
```

---

## Frontend Integration

### Example: Bank Autocomplete (React/Vue)

```javascript
// Debounced search function
const searchBanks = async (query) => {
  const response = await fetch(`/api/banks?query=${encodeURIComponent(query)}`);
  const banks = await response.json();
  return banks;
};

// Use in autocomplete component
<Autocomplete onSearch={searchBanks} displayField="name" valueField="code" />;
```

### Example: Account Validation

```javascript
const validateAccount = async (accountNumber, bankCode) => {
  try {
    const response = await fetch(
      `/api/banks/validate?account_number=${accountNumber}&bank_code=${bankCode}`,
    );

    if (!response.ok) {
      throw new Error('Validation failed');
    }

    const data = await response.json();
    return data.account_name; // "JOHN DOE"
  } catch (error) {
    console.error('Account validation error:', error);
    return null;
  }
};
```

---

## Notes

- The bank list is loaded from `banks.json` at service initialization
- Paystack API calls are made synchronously with a 10-second timeout
- All responses follow NestJS standard format
- CORS should be configured if frontend is on a different domain
