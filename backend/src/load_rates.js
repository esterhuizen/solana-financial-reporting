import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
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

// Function to parse CSV files and load exchange rates
async function loadRatesFromCsv() {
  try {
    // Load SOL/USD rates
    const solCsvPath = path.resolve('/home/sol/build/financial_reporting_wallet/backend/input_data/SOLUSD_rates.csv');
    const solFileContent = fs.readFileSync(solCsvPath, { encoding: 'utf-8' });
    
    // Parse SOL/USD CSV data
    const solRecords = parse(solFileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Loaded ${solRecords.length} SOL/USD rates from CSV`);
    
    // Load NZD/USD rates
    const nzdCsvPath = path.resolve('/home/sol/build/financial_reporting_wallet/backend/input_data/NZDUSD_rates.csv');
    const nzdFileContent = fs.readFileSync(nzdCsvPath, { encoding: 'utf-8' });
    
    // Parse NZD/USD CSV data
    const nzdRecords = parse(nzdFileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Loaded ${nzdRecords.length} NZD/USD rates from CSV`);
    
    // Create a map of NZD/USD rates by date for easy lookup
    const nzdRatesByDate = {};
    let lastKnownRate = null;
    
    // First pass to record available rates
    for (const record of nzdRecords) {
      const rate = parseFloat(record.Open.replace(/"/g, ''));
      nzdRatesByDate[record.Date] = rate;
      lastKnownRate = rate;
    }
    
    // Sort SOL dates to ensure we process them chronologically
    const solDates = solRecords.map(record => record.Date).sort((a, b) => {
      // Convert MM/DD/YYYY to Date objects for comparison
      const [aMonth, aDay, aYear] = a.split('/');
      const [bMonth, bDay, bYear] = b.split('/');
      
      return new Date(`${aYear}-${aMonth}-${aDay}`) - new Date(`${bYear}-${bMonth}-${bDay}`);
    });
    
    // Fill in missing dates with the last known rate
    for (const dateStr of solDates) {
      if (!nzdRatesByDate[dateStr] && lastKnownRate !== null) {
        nzdRatesByDate[dateStr] = lastKnownRate;
        console.log(`Using last known rate (${lastKnownRate}) for ${dateStr}`);
      }
    }
    
    // Store rates in database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Clear existing data to avoid duplicates
      await client.query('TRUNCATE TABLE exchange_rates');
      
      let insertCount = 0;
      for (const record of solRecords) {
        // Parse date from MM/DD/YYYY format
        const dateStr = record.Date;
        const [month, day, year] = dateStr.split('/');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        // Get open price for SOL/USD, removing quotes if present
        const solUsd = parseFloat(record.Open.replace(/"/g, ''));
        
        // Get corresponding USD/NZD rate
        let usdNzd = null;
        if (nzdRatesByDate[dateStr]) {
          // The CSV contains NZD/USD rates, which is already USD/NZD
          usdNzd = nzdRatesByDate[dateStr];
        } else {
          console.log(`No NZD/USD rate available for ${dateStr}, skipping`);
          continue;
        }
        
        await client.query(
          `INSERT INTO exchange_rates (date, sol_usd, nzd_usd) 
           VALUES ($1, $2, $3)`,
          [formattedDate, solUsd, usdNzd]
        );
        
        insertCount++;
      }
      
      await client.query('COMMIT');
      console.log(`${insertCount} exchange rates loaded successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error loading exchange rates:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error loading rates from CSV:', error);
  }
}

// Main function
async function main() {
  try {
    console.log('Starting exchange rates import');
    
    // Ensure the exchange_rates table exists
    await setupExchangeRatesTable();
    
    // Load rates from CSV files
    await loadRatesFromCsv();
    
    console.log('Exchange rates import completed');
  } catch (error) {
    console.error('Error in exchange rates import:', error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the script
main().then(() => {
  console.log('Exchange rates import completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Failed to import exchange rates:', error);
  process.exit(1);
});