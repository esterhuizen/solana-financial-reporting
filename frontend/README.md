# Solana Wallet Transaction Tracker - Frontend

This Next.js frontend provides a clean, user-friendly interface for tracking and reporting Solana wallet transactions for compliance purposes.

## Features

- Search transactions by date range and wallet address
- View transaction details in a table format
- Manage tracked wallet addresses
- Responsive design with dark theme

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables in `.env.local` file:
   ```
   API_URL=http://localhost:5001/api
   ```

3. Run the frontend application:
   ```
   npm run dev
   ```

4. Access the application at:
   ```
   http://localhost:3001
   ```

## Build for Production

```
npm run build
npm start
```

## UI Components

- **Header**: App title and subtitle
- **SearchForm**: Date range picker and wallet selection dropdown
- **TransactionTable**: Results display with transaction details
- **WalletManager**: Interface to add and remove tracked wallets