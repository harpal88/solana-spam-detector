/**
 * Solana Dusting Attack Detector
 *
 * This script analyzes Solana wallet addresses, transactions, blocks, and tokens
 * to detect potential dusting attacks. It uses the Helius API to fetch and analyze data.
 *
 * Usage:
 * node index.js <mode> <parameters>
 */

const { detectDustingAttacks } = require('./wallet-analyzer');
const { analyzeSingleTransaction } = require('./transaction-analyzer');
const { analyzeBlockRange } = require('./block-analyzer');
const { analyzeTokenMint } = require('./token-analyzer');
const { analyzeBatchWallets } = require('./batch-analyzer');
const { analyzeTimeRange } = require('./time-analyzer');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(`
Usage:
  1. Analyze wallet: node index.js wallet <wallet-address> [num-transactions]
  2. Analyze transaction: node index.js tx <transaction-signature>
  3. Analyze block range: node index.js blocks <start-slot> <end-slot> [max-transactions]
  4. Analyze token mint: node index.js token <token-mint-address> [max-transactions]
  5. Analyze multiple wallets: node index.js batch <wallet1,wallet2,wallet3,...> [transactions-per-wallet]
  6. Analyze time range: node index.js time <wallet-address> <start-date> <end-date> [max-transactions]

Examples:
  node index.js wallet vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg 20
  node index.js tx 4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf
  node index.js blocks 150000000 150000100 50
  node index.js token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 30
  node index.js batch vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg,HMBKn2hPdLLEadXxKxM2bfeqHeXxqtVMpB8e9yJDTc5z 15
  node index.js time vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg 1640995200 1672531200 30
  node index.js time vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg "2022-01-01" "2022-12-31" 30
  node index.js time vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg "Jan 1, 2022" "Dec 31, 2022" 30
  `);
  process.exit(1);
}

const mode = args[0].toLowerCase();

if (mode === 'wallet') {
  if (args.length < 2) {
    console.error('Error: Wallet address is required for wallet analysis mode');
    process.exit(1);
  }

  const walletAddress = args[1];
  const numTransactions = args.length > 2 ? parseInt(args[2], 10) : 10;

  // Run the wallet detector
  detectDustingAttacks(walletAddress, numTransactions).catch(error => {
    console.error('Error running dusting attack detector:', error);
    process.exit(1);
  });
} else if (mode === 'tx') {
  if (args.length < 2) {
    console.error('Error: Transaction signature is required for transaction analysis mode');
    process.exit(1);
  }

  const signature = args[1];

  // Run the transaction analyzer
  analyzeSingleTransaction(signature).catch(error => {
    console.error('Error analyzing transaction:', error);
    process.exit(1);
  });
} else if (mode === 'blocks') {
  if (args.length < 3) {
    console.error('Error: Start and end slots are required for block range analysis mode');
    process.exit(1);
  }

  const startSlot = parseInt(args[1], 10);
  const endSlot = parseInt(args[2], 10);
  const maxTransactions = args.length > 3 ? parseInt(args[3], 10) : 100;

  if (isNaN(startSlot) || isNaN(endSlot)) {
    console.error('Error: Start and end slots must be valid numbers');
    process.exit(1);
  }

  if (endSlot < startSlot) {
    console.error('Error: End slot must be greater than or equal to start slot');
    process.exit(1);
  }

  // Run the block range analyzer
  analyzeBlockRange(startSlot, endSlot, maxTransactions).catch(error => {
    console.error('Error analyzing block range:', error);
    process.exit(1);
  });
} else if (mode === 'token') {
  if (args.length < 2) {
    console.error('Error: Token mint address is required for token analysis mode');
    process.exit(1);
  }

  const tokenMint = args[1];
  const maxTransactions = args.length > 2 ? parseInt(args[2], 10) : 50;

  // Run the token analyzer
  analyzeTokenMint(tokenMint, maxTransactions).catch(error => {
    console.error('Error analyzing token mint:', error);
    process.exit(1);
  });
} else if (mode === 'batch') {
  if (args.length < 2) {
    console.error('Error: Comma-separated list of wallet addresses is required for batch analysis mode');
    process.exit(1);
  }

  const walletList = args[1].split(',').map(wallet => wallet.trim());
  const numTransactions = args.length > 2 ? parseInt(args[2], 10) : 10;

  if (walletList.length === 0) {
    console.error('Error: No valid wallet addresses provided');
    process.exit(1);
  }

  // Run the batch analyzer
  analyzeBatchWallets(walletList, numTransactions).catch(error => {
    console.error('Error analyzing wallets in batch:', error);
    process.exit(1);
  });
} else if (mode === 'time') {
  if (args.length < 4) {
    console.error('Error: Wallet address, start date/timestamp, and end date/timestamp are required for time-based analysis mode');
    process.exit(1);
  }

  const walletAddress = args[1];
  const startTime = args[2];
  const endTime = args[3];
  const maxTransactions = args.length > 4 ? parseInt(args[4], 10) : 50;

  // Run the time-based analyzer
  // The parseDate function in time-analyzer.js will handle the date string or timestamp conversion
  analyzeTimeRange(walletAddress, startTime, endTime, maxTransactions).catch(error => {
    console.error('Error analyzing time range:', error);
    console.error('Note: Date inputs can be Unix timestamps or date strings like "2022-01-01" or "Jan 1, 2022"');
    process.exit(1);
  });
} else {
  console.error(`Error: Unknown mode '${mode}'. Valid modes are: wallet, tx, blocks, token, batch, time`);
  process.exit(1);
}
