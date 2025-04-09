# Solana Wallet Transaction Tracker - Backend

This service fetches and stores Solana wallet transactions and exchange rates for the Financial Reporting Wallet application.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables (optional):
   - Create a `.env` file with the following variables:
   ```
   DB_USER=webu
   DB_PASSWORD=l3v3lUP
   DB_HOST=localhost
   DB_PORT=5432
   DB_DATABASE=webapp
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   ```

## Usage

### Wallet Transactions

Run the script to fetch the last 24 hours of transactions for all tracked wallets:

```
npm run fetch
```

The script will:
1. Set up the necessary database tables if they don't exist
2. Add a default wallet if no wallets are being tracked
3. Fetch transactions for all tracked wallets from the last 24 hours
4. Store the transactions in the database
5. Exit after completion

### Exchange Rates

There are two scripts for managing exchange rates:

1. Load historical data from CSV:
```
npm run load-rates
```

This script will:
- Set up the `exchange_rates` table if it doesn't exist
- Load historical SOL/USD rates from the CSV file in the input_data directory
- Fetch the current NZD/USD rate (which will be used for all historical dates)
- Store the rates in the database

2. Fetch today's rates only:
```
npm run fetch-rates
```

This script will:
- Check if today's rates are already in the database
- If not, fetch the current SOL/USD and NZD/USD rates
- Store the rates in the database

## Automated Setup

Run the start script to set up automated data collection:

```
./start.sh
```

This will:
1. Start the wallet transaction service
2. Set up a cron job to fetch exchange rates at midnight daily

## Data Structure

The service maintains three tables:

1. `wallets`: Stores wallet addresses to track
   - `id`: Serial primary key
   - `address`: Wallet address (unique)

2. `wallet_transactions`: Stores transaction data
   - `id`: Transaction signature (primary key)
   - `from_wallet`: Sender wallet address
   - `to_wallet`: Recipient wallet address
   - `amount`: Transaction amount in lamports (1 SOL = 1,000,000,000 lamports)
   - `time`: Transaction timestamp

3. `exchange_rates`: Stores daily exchange rates
   - `date`: Date of the exchange rate (primary key)
   - `sol_usd`: SOL to USD exchange rate
   - `nzd_usd`: USD to NZD exchange rate (USD/NZD)
   
   Note: Historical data is loaded from CSV files, and daily updates are fetched from public APIs.

## Rate Limiting

The scripts include rate limiting to avoid being throttled by external APIs:
- Solana RPC: 5 requests per second
- Exchange rate APIs: 1 request per second