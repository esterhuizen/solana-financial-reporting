# Solana Wallet Transaction Tracker - API

This Express.js API provides endpoints to access and manage Solana wallet transaction data and exchange rates.

## Features

- Retrieve wallet addresses for reporting
- Search transactions by date range and wallet address
- Access exchange rates for SOL/USD and NZD/USD
- Add and remove wallet addresses for tracking

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables in `.env` file:
   ```
   PORT=5001
   DB_USER=webu
   DB_PASSWORD=l3v3lUP
   DB_HOST=localhost
   DB_PORT=5432
   DB_DATABASE=webapp
   ```

3. Run the API server:
   ```
   npm start
   ```

   For development with auto-reload:
   ```
   npm run dev
   ```

## API Endpoints

### Get All Wallets

```
GET /api/wallets
```

Returns a list of all wallet addresses available for reporting.

### Get Transactions

```
GET /api/transactions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&walletAddress=OPTIONAL_ADDRESS
```

Required query parameters:
- `startDate`: Start date in YYYY-MM-DD format
- `endDate`: End date in YYYY-MM-DD format

Optional query parameters:
- `walletAddress`: Filter transactions by this wallet address

Returns transactions that match the search criteria, with amount in both SOL and lamports.

### Get Exchange Rates

```
GET /api/exchange-rates?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

Required query parameters:
- `startDate`: Start date in YYYY-MM-DD format
- `endDate`: End date in YYYY-MM-DD format

Returns exchange rates for SOL/USD and NZD/USD within the specified date range.

### Add Wallet

```
POST /api/wallet
```

Request body:
```json
{
  "address": "Solana wallet address"
}
```

Adds a new wallet address to track.

### Remove Wallet

```
DELETE /api/wallet/:id
```

Removes a wallet from tracking by its ID.

### Health Check

```
GET /health
```

Returns the current status of the API service.