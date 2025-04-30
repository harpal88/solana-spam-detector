/**
 * Solana Dusting Attack Detector
 *
 * This script analyzes Solana wallet addresses, transactions, blocks, and tokens
 * to detect potential dusting attacks. It uses the Helius API to fetch and analyze data.
 *
 * Usage:
 * node index.js <mode> <parameters>
 */

const { detectDustingAttacks, analyzeWalletTokensCommand } = require('./src/analyzers/wallet-analyzer-new');
const { analyzeSingleTransaction } = require('./src/analyzers/transaction-analyzer');
const { analyzeBlockRange } = require('./src/analyzers/block-analyzer');
const { analyzeTokenMint } = require('./src/analyzers/token-analyzer');
const { analyzeBatchWallets } = require('./src/analyzers/batch-analyzer');
const { analyzeTimeRange } = require('./src/analyzers/time-analyzer');
const { analyzeMemo, analyzeMemoList, analyzeMemoText } = require('./src/analyzers/memo-analyzer');
const fs = require('fs');
const path = require('path');

/**
 * Display help message with available commands and examples
 */
function showHelp() {
  console.log(`
=== Solana Spam Detector CLI ===

USAGE:
  node index.js <command> [options]

COMMANDS:
  wallet    Analyze a wallet address for dusting attacks
  tokens    Analyze all tokens in a wallet
  tx        Analyze a specific transaction
  blocks    Analyze a range of blocks
  token     Analyze a token mint address
  batch     Analyze multiple wallet addresses
  time      Analyze transactions within a time range
  memo      Analyze a memo for scam indicators
  help      Show this help message

OPTIONS:
  wallet <address> [num-transactions]
    address           Wallet address to analyze
    num-transactions  Number of transactions to analyze (default: 10)

  tokens <address> [num-transactions]
    address           Wallet address to analyze tokens for
    num-transactions  Optional: Number of transactions to analyze (default: 0, only analyze tokens in wallet)

  tx <signature>
    signature         Transaction signature to analyze

  blocks <start-slot> <end-slot> [max-transactions]
    start-slot        Starting block slot number
    end-slot          Ending block slot number
    max-transactions  Maximum transactions to analyze (default: 100)

  token <mint-address> [max-transactions]
    mint-address      Token mint address to analyze
    max-transactions  Maximum transactions to analyze (default: 50)

  batch <file-path | addresses> [transactions-per-wallet]
    file-path         Path to file containing wallet addresses (one per line)
    addresses         Comma-separated list of wallet addresses
    transactions-per-wallet  Number of transactions per wallet (default: 10)

  time <address> <start-time> <end-time> [max-transactions]
    address           Wallet address to analyze
    start-time        Start time (timestamp or date string)
    end-time          End time (timestamp or date string)
    max-transactions  Maximum transactions to analyze (default: 50)

  memo <text | file-path>
    text              Memo text to analyze
    file-path         Path to file containing memos (one per line)

EXAMPLES:
  node index.js wallet vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg 2
  node index.js tokens vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg
  node index.js tx 34gHvqdYVvVr2cNYd1XmC1UxVd3baH5bMEBf7doLMCDnorfvpFCq3VbtixN9d17Dq8SZHKJ7Hmmsg57SHJrwB95h
  node index.js blocks 303334514 303334514 1
  node index.js token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 3
  node index.js batch ./data/wallets.txt 1
  node index.js batch vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg,HMBKn2hPdLLEadXxKxM2bfeqHeXxqtVMpB8e9yJDTc5z 1
  node index.js time vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg "2025-01-01" "2025-12-31" 3
  node index.js memo "Claim your free airdrop at https://scam-site.com"
  node index.js memo ./data/memos.txt
`);
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
  showHelp();
  if (args.length < 1) {
    process.exit(1);
  } else {
    process.exit(0);
  }
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
    console.error('Error: File path or comma-separated list of wallet addresses is required for batch analysis mode');
    process.exit(1);
  }

  const input = args[1];
  const numTransactions = args.length > 2 ? parseInt(args[2], 10) : 10;
  let walletList = [];

  // Check if the input is a file path
  if (fs.existsSync(input) && fs.statSync(input).isFile()) {
    try {
      // Read wallet addresses from file (one per line)
      walletList = fs.readFileSync(input, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      console.log(`Loaded ${walletList.length} wallet addresses from file: ${input}`);
    } catch (error) {
      console.error('Error reading wallet addresses file:', error);
      process.exit(1);
    }
  } else {
    // Parse comma-separated list
    walletList = input.split(',').map(wallet => wallet.trim());
  }

  if (walletList.length === 0) {
    console.error('Error: No valid wallet addresses provided');
    process.exit(1);
  }

  console.log(`\n=== Batch Analysis of ${walletList.length} Wallets ===`);
  console.log(`Transactions per wallet: ${numTransactions}`);
  console.log('======================================\n');

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
} else if (mode === 'tokens') {
  if (args.length < 2) {
    console.error('Error: Wallet address is required for token analysis mode');
    process.exit(1);
  }

  const walletAddress = args[1];
  // Make numTransactions optional - if provided, analyze that many transactions
  // If not provided or 0, only analyze tokens in wallet without transaction analysis
  const numTransactions = args.length > 2 ? parseInt(args[2], 10) : 0;

  // Run the wallet token analyzer command
  analyzeWalletTokensCommand(walletAddress, numTransactions).catch(error => {
    console.error('Error analyzing wallet tokens:', error);
    process.exit(1);
  });
} else if (mode === 'memo') {
  if (args.length < 2) {
    console.error('Error: Memo text or file path is required for memo analysis mode');
    process.exit(1);
  }

  const memoInput = args[1];

  // Check if the input is a file path
  if (fs.existsSync(memoInput) && fs.statSync(memoInput).isFile()) {
    try {
      // Read memos from file (one per line)
      const memos = fs.readFileSync(memoInput, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (memos.length === 0) {
        console.error('Error: No valid memos found in the file');
        process.exit(1);
      }

      // Analyze multiple memos
      try {
        analyzeMemoList(memos);
      } catch (error) {
        console.error('Error analyzing memos:', error);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error reading memo file:', error);
      process.exit(1);
    }
  } else {
    // Analyze single memo text directly
    try {
      const analysis = analyzeMemoText(memoInput);

      console.log(`\n=== Solana Memo Text Analysis ===`);
      console.log(`Analyzing memo: "${memoInput}"`);
      console.log('======================================\n');

      console.log(`Suspicious: ${analysis.isSuspicious ? 'YES' : 'NO'}`);

      if (analysis.isSuspicious) {
        console.log(`Suspicious Score: ${analysis.suspiciousScore}`);

        if (analysis.containsUrl) {
          console.log(`Contains URLs: ${analysis.urls.join(', ')}`);
        }

        if (analysis.foundTerms.length > 0) {
          console.log(`Suspicious Terms: ${analysis.foundTerms.join(', ')}`);
        }

        console.log(`Reason: ${analysis.reason}`);

        // Determine risk level based on score
        let riskLevel = 'LOW';
        if (analysis.suspiciousScore >= 10) {
          riskLevel = 'VERY HIGH';
        } else if (analysis.suspiciousScore >= 7) {
          riskLevel = 'HIGH';
        } else if (analysis.suspiciousScore >= 4) {
          riskLevel = 'MEDIUM';
        }

        console.log(`\nRisk Level: ${riskLevel}`);

        console.log('\n⚠️ Recommendations:');
        console.log('1. Never click on links in transaction memos');
        console.log('2. Ignore promotional messages in transaction memos');
        console.log('3. Be cautious of transactions containing suspicious memos');
      }

      console.log('\n=== Analysis Complete ===');
    } catch (error) {
      console.error('Error analyzing memo:', error);
      process.exit(1);
    }
  }
} else {
  console.error(`Error: Unknown mode '${mode}'. Valid modes are: wallet, tokens, tx, blocks, token, batch, time, memo`);
  process.exit(1);
}
