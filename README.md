# Solana Wallet Transaction Tracker

A comprehensive solution for tracking and reporting Solana wallet transactions for compliance purposes.

## Overview

This project consists of three main components:

1. **Backend Service**: Collects Solana transaction data daily and stores it in a PostgreSQL database
2. **API Service**: Provides endpoints to access and manage transaction data
3. **Frontend Application**: User interface for searching and viewing transaction reports

## Components

### Backend Service

- Located in `/backend`
- JavaScript CLI application
- Fetches Solana wallet transactions daily using a cron job
- Stores transaction data in PostgreSQL
- [Backend README](/backend/README.md)

### API Service

- Located in `/api`
- Express.js REST API
- Provides endpoints for transaction search and wallet management
- Runs on port 5001
- [API README](/api/README.md)

### Frontend Application

- Located in `/frontend`
- Next.js web application
- Clean, responsive UI with dark theme
- Allows date-based transaction search
- Runs on port 3001
- [Frontend README](/frontend/README.md)

## Setup and Installation

### Prerequisites

- Node.js (v16+)
- PostgreSQL database
- Internet connection for Solana RPC access

### Database Setup

Configure PostgreSQL with the following credentials:
```
DB_USER=xxxx
DB_PASSWORD=xxxx
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=webapp
```

The application will automatically create the required tables on first run.

### Starting the Application

1. Install dependencies for each component:
   ```
   cd backend && npm install
   cd ../api && npm install
   cd ../frontend && npm install
   ```

2. Start the backend service (data collection):
   ```
   cd backend && npm start
   ```

3. Start the API service:
   ```
   cd api && npm start
   ```

4. Start the frontend application:
   ```
   cd frontend && npm run dev
   ```

5. Access the web application at:
   ```
   http://localhost:3001
   ```

## Default Configuration

- Default tracked wallet: `Df9nkXFqWJsm1pjjjfZ1R7uFKkwoSBcAvEYyjy36pVjz`
- Additional wallets can be added through the web interface
