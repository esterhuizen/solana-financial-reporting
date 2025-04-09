import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const { Pool } = pkg;

dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-1234';

// Initialize database connection
const pool = new Pool({
  user: process.env.DB_USER || 'webu',
  password: process.env.DB_PASSWORD || 'l3v3lUP',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'webapp',
});

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// API Routes

// GET /api/wallets - Return all wallets available for reporting
app.get('/api/wallets', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, address FROM wallets ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching wallets:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// GET /api/transactions - Return transactions based on search criteria
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, walletAddress } = req.query;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    // Get transactions
    let txQuery = `
      SELECT 
        id, 
        from_wallet, 
        to_wallet, 
        amount, 
        time
      FROM 
        wallet_transactions 
      WHERE 
        time >= $1 AND time <= $2
    `;
    
    const queryParams = [startDate, endDate];
    
    // Add wallet filter if specified
    if (walletAddress) {
      txQuery += ` AND (from_wallet = $3 OR to_wallet = $3)`;
      queryParams.push(walletAddress);
    }
    
    // Add order by clause
    txQuery += ` ORDER BY time DESC`;
    
    const txResult = await pool.query(txQuery, queryParams);
    console.log(`Found ${txResult.rows.length} transactions`);
    
    // Get all relevant exchange rates for the date range
    const ratesQuery = `
      SELECT date, sol_usd, nzd_usd
      FROM exchange_rates
      WHERE date >= $1::date AND date <= $2::date
    `;
    
    // Ensure endDate includes the full day by converting to date without time
    const startDateOnly = startDate.split('T')[0];
    const endDateOnly = endDate.split('T')[0];
    console.log(`Querying exchange rates from ${startDateOnly} to ${endDateOnly} (inclusive)`);
    
    const ratesResult = await pool.query(ratesQuery, [startDateOnly, endDateOnly]);
    console.log(`Found ${ratesResult.rows.length} exchange rates`);
    
    // Create a map of exchange rates by date string
    const exchangeRatesByDate = {};
    ratesResult.rows.forEach(rate => {
      // Convert to YYYY-MM-DD string format
      const dateStr = rate.date.toISOString().split('T')[0];
      exchangeRatesByDate[dateStr] = {
        sol_usd: parseFloat(rate.sol_usd),
        nzd_usd: parseFloat(rate.nzd_usd)
      };
    });
    
    console.log(`Exchange rates map has ${Object.keys(exchangeRatesByDate).length} dates`);
    if (Object.keys(exchangeRatesByDate).length > 0) {
      console.log('Sample dates in exchange rates map:', Object.keys(exchangeRatesByDate).slice(0, 3));
    }
    
    // Format and enhance the transactions with exchange rates
    const formattedTransactions = txResult.rows.map(tx => {
      const direction = walletAddress 
        ? (tx.from_wallet === walletAddress ? 'outgoing' : 'incoming')
        : 'unknown';
        
      // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
      const solAmount = tx.amount / 1_000_000_000;
      
      // Extract date in YYYY-MM-DD format from transaction timestamp
      const txDate = new Date(tx.time).toISOString().split('T')[0];
      
      // Look up exchange rates for this date
      const exchangeRates = exchangeRatesByDate[txDate];
      
      // Calculate USD and NZD values if exchange rates are available
      let usdValue = null;
      let nzdValue = null;
      let solUsd = null;
      let nzdUsd = null;
      
      if (exchangeRates) {
        solUsd = exchangeRates.sol_usd;
        nzdUsd = exchangeRates.nzd_usd;
        usdValue = solAmount * solUsd;
        
        // Fix NZD calculation - should be higher than USD value
        // We're using the inverse of the current rate to get the NZD value
        nzdValue = usdValue / nzdUsd;
      }
      
      return {
        id: tx.id,
        from_wallet: tx.from_wallet,
        to_wallet: tx.to_wallet,
        time: tx.time,
        direction,
        solAmount,
        usdValue,
        nzdValue,
        // Exchange rates for reference
        exchangeRates: {
          sol_usd: solUsd,
          nzd_usd: nzdUsd
        },
        // Debug info - remove in production
        debug: {
          tx_date: txDate,
          has_rates: !!exchangeRates
        },
        // Keep the original amount in lamports
        lamports: tx.amount
      };
    });
    
    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/exchange-rates - Return exchange rates based on date range
app.get('/api/exchange-rates', authenticateToken, async (req, res) => {
  console.log('Received request to /api/exchange-rates with params:', req.query);
  
  try {
    const { startDate, endDate } = req.query;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      console.log('Missing required date parameters');
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    // Check if exchange_rates table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'exchange_rates'
      )
    `;
    const tableCheckResult = await pool.query(checkTableQuery);
    const tableExists = tableCheckResult.rows[0].exists;
    
    console.log(`Exchange rates table exists: ${tableExists}`);
    
    if (!tableExists) {
      return res.status(404).json({ error: 'Exchange rates table does not exist yet' });
    }
    
    // Get count of records in the table
    const countQuery = 'SELECT COUNT(*) FROM exchange_rates';
    const countResult = await pool.query(countQuery);
    console.log(`Total exchange rates in database: ${countResult.rows[0].count}`);
    
    // Query for exchange rates within the date range
    const query = `
      SELECT 
        date, 
        sol_usd, 
        nzd_usd 
      FROM 
        exchange_rates 
      WHERE 
        date >= $1::date AND date <= $2::date 
      ORDER BY 
        date ASC
    `;
    
    // Ensure we're using date-only strings for proper date comparison
    const startDateOnly = startDate.split('T')[0];
    const endDateOnly = endDate.split('T')[0];
    
    console.log(`Querying exchange rates from ${startDateOnly} to ${endDateOnly}`);
    const result = await pool.query(query, [startDateOnly, endDateOnly]);
    console.log(`Found ${result.rows.length} exchange rates in date range`);
    
    if (result.rows.length > 0) {
      console.log('Sample exchange rate:', result.rows[0]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: `Failed to fetch exchange rates: ${error.message}` });
  }
});

// POST /api/wallet - Add a new wallet to track
app.post('/api/wallet', authenticateToken, async (req, res) => {
  try {
    const { address } = req.body;
    
    // Validate wallet address
    if (!address || typeof address !== 'string' || address.trim() === '') {
      return res.status(400).json({ error: 'Valid wallet address is required' });
    }
    
    // Check if wallet already exists
    const existingWallet = await pool.query(
      'SELECT address FROM wallets WHERE address = $1',
      [address]
    );
    
    if (existingWallet.rowCount > 0) {
      return res.status(409).json({ error: 'Wallet address already exists' });
    }
    
    // Add the new wallet
    const result = await pool.query(
      'INSERT INTO wallets (address) VALUES ($1) RETURNING id, address',
      [address]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding wallet:', error);
    res.status(500).json({ error: 'Failed to add wallet' });
  }
});

// DELETE /api/wallet/:id - Remove a wallet from tracking
app.delete('/api/wallet/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate wallet ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Valid wallet ID is required' });
    }
    
    // Delete the wallet
    const result = await pool.query(
      'DELETE FROM wallets WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    res.json({ message: 'Wallet removed successfully', id: parseInt(id) });
  } catch (error) {
    console.error('Error removing wallet:', error);
    res.status(500).json({ error: 'Failed to remove wallet' });
  }
});

// Import child_process and path at the top level (ES modules style)
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// POST /api/fetch-transactions - Trigger fetching 365 days of transactions for a wallet
app.post('/api/fetch-transactions', authenticateToken, async (req, res) => {
  try {
    const { address } = req.body;
    
    // Validate wallet address
    if (!address || typeof address !== 'string' || address.trim() === '') {
      return res.status(400).json({ error: 'Valid wallet address is required' });
    }
    
    // Get current file directory with ES modules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Get the backend directory path (assuming standard structure)
    const backendDir = path.resolve(__dirname, '../../backend');
    
    // Execute the command to run the fetch script
    exec(`cd ${backendDir} && node src/fetch_wallet_history.js ${address}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing fetch script: ${error.message}`);
        // We don't want to fail the request if the background process has issues
      }
      console.log(`Fetch script output: ${stdout}`);
      if (stderr) {
        console.error(`Fetch script error: ${stderr}`);
      }
    });
    
    res.json({ 
      message: 'Transaction fetch initiated',
      address: address,
      status: 'processing'
    });
  } catch (error) {
    console.error('Error triggering transaction fetch:', error);
    res.status(500).json({ error: 'Failed to trigger transaction fetch' });
  }
});

// User authentication endpoints
// POST /api/auth/register - Register a new user (admin only)
app.post('/api/auth/register', authenticateToken, async (req, res) => {
  try {
    // Check if user is an admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Only admins can register new users' });
    }

    const { username, password, is_admin = false } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if username already exists
    const existingUser = await pool.query(
      'SELECT username FROM users WHERE username = $1',
      [username]
    );
    
    if (existingUser.rowCount > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin',
      [username, hashedPassword, is_admin]
    );
    
    res.status(201).json({
      id: result.rows[0].id,
      username: result.rows[0].username,
      is_admin: result.rows[0].is_admin
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login - Login and get token
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if user exists
    const result = await pool.query(
      'SELECT id, username, password, is_admin FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Compare password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/auth/me - Get current user info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, is_admin FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// GET /api/users - Get all users (admin only)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is an admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const result = await pool.query(
      'SELECT id, username, is_admin FROM users ORDER BY id'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// DELETE /api/users/:id - Delete a user (admin only)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is an admin
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    
    // Validate input
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }
    
    // Don't allow deletion of the current user
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Delete the user
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully', id: parseInt(id) });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Initialize admin user if not exist
async function initAdminUser() {
  try {
    // Check if users table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `;
    const tableCheckResult = await pool.query(checkTableQuery);
    const tableExists = tableCheckResult.rows[0].exists;
    
    if (!tableExists) {
      // Create users table
      const createTableQuery = `
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(100) NOT NULL,
          is_admin BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await pool.query(createTableQuery);
      console.log('Users table created');
    }
    
    // Check if admin user exists
    const adminCheck = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      ['4dm1n']
    );
    
    if (adminCheck.rowCount === 0) {
      // Create admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('4dm1n', salt);
      
      await pool.query(
        'INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3)',
        ['4dm1n', hashedPassword, true]
      );
      console.log('Admin user created');
    }
  } catch (error) {
    console.error('Error initializing admin user:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// Start the server
app.listen(PORT, async () => {
  console.log(`API server running on http://localhost:${PORT}`);
  // Initialize admin user on startup
  await initAdminUser();
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await pool.end();
  process.exit(0);
});