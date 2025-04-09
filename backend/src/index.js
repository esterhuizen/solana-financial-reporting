import dotenv from 'dotenv';
import { Connection, PublicKey } from '@solana/web3.js';
import pkg from 'pg';
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

// Initialize Solana connection
const solanaConnection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

// Function to fetch wallet addresses from the database
async function getWalletsToTrack() {
  try {
    const result = await pool.query('SELECT address FROM wallets');
    return result.rows.map(row => row.address);
  } catch (error) {
    console.error('Error fetching wallets:', error);
    return [];
  }
}

// Helper function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry function with exponential backoff for API calls
async function fetchWithRetry(fetchFn, maxRetries = 5, initialDelay = 500) {
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await fetchFn();
    } catch (error) {
      if (error.toString().includes('429 Too Many Requests') && retries < maxRetries) {
        console.log(`Server responded with 429 Too Many Requests. Retrying after ${delay}ms delay...`);
        await sleep(delay);
        retries++;
        delay *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}

// Function to fetch and store transactions for a specific wallet
async function fetchAndStoreTransactions(walletAddress) {
  try {
    console.log(`Fetching transactions for wallet: ${walletAddress}`);
    const publicKey = new PublicKey(walletAddress);
    
    // The Solana RPC expects specific parameter formats
    // For time filtering, we'll use the newer approach of letting the API
    // handle the time filtering rather than using the 'until' parameter
    
    // Get confirmed signatures for the account - we'll filter them after
    const signatures = await fetchWithRetry(async () => {
      return await solanaConnection.getSignaturesForAddress(
        publicKey,
        { 
          limit: 1000 // Limit the number of signatures to fetch
        }
      );
    });
    
    // Filter to only include signatures from the last 24 hours
    const oneDayAgoMs = Date.now() - (24 * 60 * 60 * 1000);
    const recentSignatures = signatures.filter(sig => {
      // blockTime is in seconds, convert to ms for comparison
      return sig.blockTime && (sig.blockTime * 1000 >= oneDayAgoMs);
    });
    
    // Limit to a maximum of 20 transactions to process per run to avoid rate limits
    const MAX_TRANSACTIONS = 200000;
    const limitedSignatures = recentSignatures.slice(0, MAX_TRANSACTIONS);
    if (recentSignatures.length > MAX_TRANSACTIONS) {
      console.log(`Limiting to ${MAX_TRANSACTIONS} most recent transactions to avoid rate limits`);
    }
    
    console.log(`Found ${recentSignatures.length} transactions in the last 24 hours for wallet: ${walletAddress}`);
    if (limitedSignatures.length > 0) {
      console.log(`Processing ${limitedSignatures.length} transactions`);
    } else {
      console.log('No transactions to process');
    }
    
    // Rate limiting parameters - increase delay to avoid rate limits
    const RATE_LIMIT_DELAY = 500; // 500ms delay between requests (2 requests per second)
    
    for (const [index, signatureInfo] of limitedSignatures.entries()) {
      const signature = signatureInfo.signature;
      
      // Check if transaction already exists in database
      const existingTx = await pool.query(
        'SELECT id FROM wallet_transactions WHERE id = $1',
        [signature]
      );
      
      if (existingTx.rowCount > 0) {
        console.log(`Transaction ${signature} already exists, skipping`);
        continue;
      }
      
      // Apply rate limiting every request
      if (index > 0) {
        await sleep(RATE_LIMIT_DELAY);
      }
      
      // Get transaction details with retry
      let transaction;
      try {
        transaction = await fetchWithRetry(async () => {
          return await solanaConnection.getTransaction(signature);
        });
      } catch (error) {
        console.log(`Error fetching details for transaction ${signature}: ${error.message}`);
        continue;
      }
      
      if (!transaction || !transaction.meta) {
        console.log(`Could not fetch details for transaction ${signature}`);
        continue;
      }
      
      // Check if this transaction involves SOL transfers (not just token transfers)
      const preBalances = transaction.meta.preBalances;
      const postBalances = transaction.meta.postBalances;
      const accountKeys = transaction.transaction.message.accountKeys.map(key => key.toBase58());
      
      // Find the index of our wallet in the accounts list
      const walletIndex = accountKeys.indexOf(walletAddress);
      
      if (walletIndex === -1) {
        console.log(`Wallet ${walletAddress} not found in transaction accounts`);
        continue;
      }
      
      // Calculate the change in SOL balance for this wallet (in lamports)
      const balanceDelta = postBalances[walletIndex] - preBalances[walletIndex];
      
      // Skip if no SOL was transferred
      if (balanceDelta === 0) {
        console.log(`No SOL transferred for wallet ${walletAddress} in transaction ${signature}`);
        continue;
      }
      
      // Determine if this was an incoming or outgoing transaction
      let fromWallet, toWallet, amount;
      
      if (balanceDelta > 0) {
        // Incoming transaction, find the sender
        toWallet = walletAddress;
        
        // This is a simplification - in complex transactions, identifying the exact sender can be tricky
        // For our purposes, we'll consider the first account with a negative balance change as the sender
        const senderIndex = postBalances.findIndex((post, i) => post < preBalances[i]);
        fromWallet = senderIndex !== -1 ? accountKeys[senderIndex] : 'unknown';
        amount = balanceDelta;
      } else {
        // Outgoing transaction, find the receiver
        fromWallet = walletAddress;
        
        // Similarly, we'll consider the first account with a positive balance change as the receiver
        const receiverIndex = postBalances.findIndex((post, i) => post > preBalances[i]);
        toWallet = receiverIndex !== -1 ? accountKeys[receiverIndex] : 'unknown';
        amount = -balanceDelta; // Convert to positive value
      }
      
      // Skip voting transactions (amount is 5000 lamports and to_wallet is 'unknown')
      if (amount === 5000 && toWallet === 'unknown') {
        console.log(`Skipping voting transaction with amount 5000 lamports to unknown wallet: ${signature}`);
        continue;
      }
      
      // Get transaction timestamp
      const blockTime = transaction.blockTime;
      const time = blockTime ? new Date(blockTime * 1000).toISOString() : new Date().toISOString();
      
      // Store the transaction in the database
      await pool.query(
        `INSERT INTO wallet_transactions (id, from_wallet, to_wallet, amount, time) 
         VALUES ($1, $2, $3, $4, $5)`,
        [signature, fromWallet, toWallet, amount, time]
      );
      
      console.log(`Stored transaction ${signature} for wallet ${walletAddress}`);
    }
    
    console.log(`Completed processing for wallet: ${walletAddress}`);
  } catch (error) {
    console.error(`Error processing wallet ${walletAddress}:`, error);
  }
}

// Main function to fetch transactions for all tracked wallets
async function fetchAllWalletTransactions() {
  try {
    console.log('Starting transaction fetch job');
    
    // Ensure required tables exist
    await setupDatabase();
    
    // Get all wallet addresses from the database
    const wallets = await getWalletsToTrack();
    
    if (wallets.length === 0) {
      console.log('No wallets to track. Adding default wallet.');
      await addDefaultWallet();
      const updatedWallets = await getWalletsToTrack();
      
      for (const wallet of updatedWallets) {
        await fetchAndStoreTransactions(wallet);
      }
    } else {
      for (const wallet of wallets) {
        await fetchAndStoreTransactions(wallet);
      }
    }
    
    console.log('Transaction fetch job completed');
  } catch (error) {
    console.error('Error in transaction fetch job:', error);
  }
}

// Function to set up required database tables
async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create wallets table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        address TEXT UNIQUE NOT NULL
      )
    `);
    
    // Create wallet_transactions table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id TEXT PRIMARY KEY,
        from_wallet TEXT NOT NULL,
        to_wallet TEXT NOT NULL,
        amount BIGINT NOT NULL,
        time TIMESTAMP NOT NULL
      )
    `);
    
    await client.query('COMMIT');
    console.log('Database setup completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to add default wallet to track
async function addDefaultWallet() {
  try {
    const defaultWallet = 'Df9nkXFqWJsm1pjjjfZ1R7uFKkwoSBcAvEYyjy36pVjz';
    
    await pool.query(
      'INSERT INTO wallets (address) VALUES ($1) ON CONFLICT (address) DO NOTHING',
      [defaultWallet]
    );
    
    console.log(`Default wallet ${defaultWallet} added to tracking list`);
  } catch (error) {
    console.error('Error adding default wallet:', error);
  }
}

// Run once and exit when complete
console.log('Starting wallet transaction fetch...');
fetchAllWalletTransactions().then(() => {
  console.log('Transaction fetch completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Failed to fetch transactions:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await pool.end();
  process.exit(0);
});
