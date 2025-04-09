import dotenv from 'dotenv';
import { Connection, PublicKey } from '@solana/web3.js';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

// Get wallet address from command line arguments
const walletAddress = process.argv[2];

if (!walletAddress) {
  console.error('Usage: node fetch_wallet_history.js <wallet-address>');
  process.exit(1);
}

console.log(`Starting historical transaction fetch for wallet: ${walletAddress}`);

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

// Function to set up required database tables
async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
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

// Function to fetch and store transactions for the specific wallet
async function fetchAndStoreHistoricalTransactions(walletAddress) {
  try {
    console.log(`Fetching 365 days of transactions for wallet: ${walletAddress}`);
    const publicKey = new PublicKey(walletAddress);
    
    // Calculate timestamp for 365 days ago
    const oneYearAgoMs = Date.now() - (365 * 24 * 60 * 60 * 1000);
    const oneYearAgoSec = Math.floor(oneYearAgoMs / 1000);
    
    console.log(`Fetching transactions since: ${new Date(oneYearAgoMs).toISOString()}`);
    
    // We'll use pagination to fetch all signatures
    let allSignatures = [];
    let lastSignature = null;
    let hasMore = true;
    
    // Rate limiting parameters
    const RATE_LIMIT_DELAY = 1000; // 1 second delay between batch requests
    const BATCH_SIZE = 1000; // Max signatures per request
    
    while (hasMore) {
      // Add delay between batches to avoid rate limiting
      if (allSignatures.length > 0) {
        await sleep(RATE_LIMIT_DELAY);
      }
      
      // Fetch options
      const options = { 
        limit: BATCH_SIZE 
      };
      
      // Add before parameter for pagination if we have a last signature
      if (lastSignature) {
        options.before = lastSignature;
      }
      
      try {
        const signatures = await fetchWithRetry(async () => {
          return await solanaConnection.getSignaturesForAddress(publicKey, options);
        });
        
        console.log(`Fetched batch of ${signatures.length} signatures`);
        
        // If we got no signatures, we're done
        if (signatures.length === 0) {
          hasMore = false;
          console.log('No more signatures to fetch');
          break;
        }
        
        // Filter to only keep signatures from the last 365 days
        const filteredSignatures = signatures.filter(sig => {
          return sig.blockTime && (sig.blockTime >= oneYearAgoSec);
        });
        
        // If all signatures in this batch are older than 365 days, we're done
        if (filteredSignatures.length === 0 && signatures.length > 0) {
          hasMore = false;
          console.log('All remaining signatures are older than 365 days');
          break;
        }
        
        // Add the filtered signatures to our collection
        allSignatures = [...allSignatures, ...filteredSignatures];
        
        // Get the last signature for pagination
        lastSignature = signatures[signatures.length - 1].signature;
        
        // If we got fewer signatures than the batch size, we've reached the end
        if (signatures.length < BATCH_SIZE) {
          hasMore = false;
          console.log('Reached end of available signatures');
        }
      } catch (error) {
        console.error(`Error fetching signature batch: ${error.message}`);
        break;
      }
    }
    
    console.log(`Found total of ${allSignatures.length} transactions in the last 365 days`);
    
    // Process the transactions with rate limiting
    const TRANSACTION_RATE_LIMIT = 500; // 500ms between transaction fetches
    
    for (const [index, signatureInfo] of allSignatures.entries()) {
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
        await sleep(TRANSACTION_RATE_LIMIT);
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
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [signature, fromWallet, toWallet, amount, time]
      );
      
      console.log(`Stored transaction ${signature} for wallet ${walletAddress}`);
      
      // Log progress every 50 transactions
      if (index > 0 && index % 50 === 0) {
        console.log(`Progress: ${index}/${allSignatures.length} transactions processed (${Math.round(index/allSignatures.length*100)}%)`);
      }
    }
    
    console.log(`Completed processing all transactions for wallet: ${walletAddress}`);
    return true;
  } catch (error) {
    console.error(`Error processing wallet ${walletAddress}:`, error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Starting historical transaction fetch');
    
    // Ensure required tables exist
    await setupDatabase();
    
    // Process the specified wallet
    await fetchAndStoreHistoricalTransactions(walletAddress);
    
    console.log('Historical transaction fetch completed');
    process.exit(0);
  } catch (error) {
    console.error('Error in historical transaction fetch:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await pool.end();
  process.exit(0);
});