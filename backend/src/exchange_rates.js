import dotenv from 'dotenv';
import pkg from 'pg';
import fetch from 'node-fetch';
const { Pool } = pkg;

dotenv.config();

// Initialize database connection
const pool = new Pool({
  user: process.env.DB_USER || 'webu',
  password: process.env.DB_PASSWORD || 'l3v3lUP',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'webapp',
});

// Function to set up the exchange_rates table
async function setupExchangeRatesTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create exchange_rates table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        date DATE PRIMARY KEY,
        sol_usd NUMERIC(12, 6) NOT NULL,
        nzd_usd NUMERIC(12, 6) NOT NULL
      )
    `);
    
    // Create index for faster date lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS exchange_rates_date_idx ON exchange_rates (date)
    `);
    
    await client.query('COMMIT');
    console.log('Exchange rates table setup completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up exchange rates table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to check if today's date is already in the database
async function isTodayInDatabase() {
  try {
    const today = new Date();
    const formattedDate = formatDate(today);
    
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM exchange_rates WHERE date = $1',
      [formattedDate]
    );
    
    return result.rows[0].count > 0;
  } catch (error) {
    console.error('Error checking if today is in database:', error);
    return false;
  }
}

// Format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Function to fetch SOL/USD price for the current day
async function fetchSolanaPrice() {
  try {
    // Using CoinGecko API for current price
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Solana price: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.solana && data.solana.usd) {
      return data.solana.usd;
    } else {
      throw new Error('No Solana price data available');
    }
  } catch (error) {
    console.error(`Error fetching Solana price:`, error);
    // Return null to handle the error case
    return null;
  }
}

// Function to fetch USD/NZD exchange rate for the current day
async function fetchUsdNzdRate() {
  try {
    // Using Exchange Rate API with NZD base to get the correct value
    const response = await fetch(
      `https://open.er-api.com/v6/latest/NZD`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch USD/NZD rate: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.rates && data.rates.USD) {
      // This gives us the correct USD/NZD value as needed
      return data.rates.USD;
    } else {
      throw new Error('No USD/NZD rate data available');
    }
  } catch (error) {
    console.error(`Error fetching USD/NZD rate:`, error);
    // Return null to handle the error case
    return null;
  }
}

// Function to store exchange rates in the database
async function storeExchangeRate(date, solUsd, nzdUsd) {
  try {
    await pool.query(
      `INSERT INTO exchange_rates (date, sol_usd, nzd_usd) 
       VALUES ($1, $2, $3)
       ON CONFLICT (date) DO UPDATE 
       SET sol_usd = $2, nzd_usd = $3`,
      [formatDate(date), solUsd, nzdUsd]
    );
    console.log(`Stored exchange rates for ${formatDate(date)}: SOL/USD=${solUsd}, USD/NZD=${nzdUsd}`);
    return true;
  } catch (error) {
    console.error(`Error storing exchange rates for ${formatDate(date)}:`, error);
    return false;
  }
}

// Helper function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to fetch and store today's exchange rates
async function fetchAndStoreExchangeRates() {
  try {
    console.log('Starting exchange rates fetch job');
    
    // Ensure the exchange_rates table exists
    await setupExchangeRatesTable();
    
    // Check if we already have today's rates
    const todayExists = await isTodayInDatabase();
    
    if (todayExists) {
      console.log('Today\'s exchange rates are already in the database');
      // Uncomment the line below if you want to force update today's rates every time
      // console.log('Continuing to update with latest rates...');
      // Comment out the return below if you want to update rates even if they exist
      return;
    } else {
      console.log('Today\'s rates not found - will add them now');
    }
    
    console.log('Fetching today\'s exchange rates');
    
    // Get today's date
    const today = new Date();
    
    // Fetch rates
    const solUsd = await fetchSolanaPrice();
    
    // Apply rate limiting between API calls
    await sleep(1000);
    
    const usdNzd = await fetchUsdNzdRate();
    
    // Skip if either rate is missing
    if (!solUsd || !usdNzd) {
      console.log('Skipping today\'s rates due to missing data');
      return;
    }
    
    // Store exchange rates in the database
    await storeExchangeRate(today, solUsd, usdNzd);
    
    console.log('Exchange rates fetch job completed');
  } catch (error) {
    console.error('Error in exchange rates fetch job:', error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run once and exit when complete
console.log('Starting exchange rates fetch...');
fetchAndStoreExchangeRates().then(() => {
  console.log('Exchange rates fetch completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Failed to fetch exchange rates:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await pool.end();
  process.exit(0);
});