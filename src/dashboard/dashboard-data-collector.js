/**
 * Dashboard Data Collector
 *
 * This module collects and stores data from token analysis for dashboard visualization.
 */

const { analyzeTokenMint } = require('../analyzers/token-analyzer');
const { analyzeTransaction } = require('../analyzers/transaction-analyzer');
const { detectDustingAttacks } = require('../analyzers/wallet-analyzer');
const fs = require('fs');
const path = require('path');

// Create data directory if it doesn't exist
const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths for storing data
const TOKEN_ANALYSIS_FILE = path.join(DATA_DIR, 'token-analysis.json');
const TRANSACTION_ANALYSIS_FILE = path.join(DATA_DIR, 'transaction-analysis.json');
const WALLET_ANALYSIS_FILE = path.join(DATA_DIR, 'wallet-analysis.json');

/**
 * Initialize data storage files if they don't exist
 */
function initializeDataStorage() {
  const initialData = { data: [], lastUpdated: null };

  if (!fs.existsSync(TOKEN_ANALYSIS_FILE)) {
    fs.writeFileSync(TOKEN_ANALYSIS_FILE, JSON.stringify(initialData));
  }

  if (!fs.existsSync(TRANSACTION_ANALYSIS_FILE)) {
    fs.writeFileSync(TRANSACTION_ANALYSIS_FILE, JSON.stringify(initialData));
  }

  if (!fs.existsSync(WALLET_ANALYSIS_FILE)) {
    fs.writeFileSync(WALLET_ANALYSIS_FILE, JSON.stringify(initialData));
  }

  console.log('Data storage initialized');
}

/**
 * Read data from a storage file
 * @param {string} filePath - Path to the data file
 * @returns {Object} The data object
 */
function readData(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading data from ${filePath}:`, error);
    return { data: [], lastUpdated: null };
  }
}

/**
 * Write data to a storage file
 * @param {string} filePath - Path to the data file
 * @param {Object} data - Data to write
 */
function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing data to ${filePath}:`, error);
  }
}

/**
 * Collect token analysis data
 * @param {string} tokenMint - Token mint address to analyze
 * @param {number} maxTransactions - Maximum number of transactions to analyze
 */
async function collectTokenAnalysisData(tokenMint, maxTransactions = 50) {
  try {
    console.log(`Collecting token analysis data for ${tokenMint}`);

    // Capture console output
    const originalConsoleLog = console.log;
    let logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    // Run token analysis
    const result = await analyzeTokenMint(tokenMint, maxTransactions);

    // Restore console.log
    console.log = originalConsoleLog;

    // Read existing data
    const storageData = readData(TOKEN_ANALYSIS_FILE);

    // Add new analysis result with timestamp
    const analysisData = {
      tokenMint,
      timestamp: new Date().toISOString(),
      result,
      logs
    };

    // Add to storage
    storageData.data.push(analysisData);
    storageData.lastUpdated = new Date().toISOString();

    // Write updated data
    writeData(TOKEN_ANALYSIS_FILE, storageData);

    console.log(`Token analysis data collected for ${tokenMint}`);
    return analysisData;
  } catch (error) {
    console.error('Error collecting token analysis data:', error);
    throw error;
  }
}

/**
 * Collect transaction analysis data
 * @param {string} signature - Transaction signature to analyze
 */
async function collectTransactionAnalysisData(signature) {
  try {
    console.log(`Collecting transaction analysis data for ${signature}`);

    // Capture console output
    const originalConsoleLog = console.log;
    let logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    // Run transaction analysis
    const result = await analyzeTransaction(signature);

    // Restore console.log
    console.log = originalConsoleLog;

    // Read existing data
    const storageData = readData(TRANSACTION_ANALYSIS_FILE);

    // Add new analysis result with timestamp
    const analysisData = {
      signature,
      timestamp: new Date().toISOString(),
      result,
      logs
    };

    // Add to storage
    storageData.data.push(analysisData);
    storageData.lastUpdated = new Date().toISOString();

    // Write updated data
    writeData(TRANSACTION_ANALYSIS_FILE, storageData);

    console.log(`Transaction analysis data collected for ${signature}`);
    return analysisData;
  } catch (error) {
    console.error('Error collecting transaction analysis data:', error);
    throw error;
  }
}

/**
 * Collect wallet analysis data
 * @param {string} walletAddress - Wallet address to analyze
 * @param {number} numTransactions - Number of transactions to analyze
 */
async function collectWalletAnalysisData(walletAddress, numTransactions = 10) {
  try {
    console.log(`Collecting wallet analysis data for ${walletAddress}`);

    // Capture console output
    const originalConsoleLog = console.log;
    let logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    // Run wallet analysis
    const result = await detectDustingAttacks(walletAddress, numTransactions);

    // Restore console.log
    console.log = originalConsoleLog;

    // Read existing data
    const storageData = readData(WALLET_ANALYSIS_FILE);

    // Add new analysis result with timestamp
    const analysisData = {
      walletAddress,
      timestamp: new Date().toISOString(),
      result,
      logs
    };

    // Add to storage
    storageData.data.push(analysisData);
    storageData.lastUpdated = new Date().toISOString();

    // Write updated data
    writeData(WALLET_ANALYSIS_FILE, storageData);

    console.log(`Wallet analysis data collected for ${walletAddress}`);
    return analysisData;
  } catch (error) {
    console.error('Error collecting wallet analysis data:', error);
    throw error;
  }
}

/**
 * Get aggregated statistics for dashboard
 * @returns {Object} Dashboard statistics
 */
function getDashboardStats() {
  // Read all data
  const tokenData = readData(TOKEN_ANALYSIS_FILE);
  const transactionData = readData(TRANSACTION_ANALYSIS_FILE);
  const walletData = readData(WALLET_ANALYSIS_FILE);

  // Calculate token statistics
  const tokenStats = calculateTokenStats(tokenData.data);

  // Calculate transaction statistics
  const transactionStats = calculateTransactionStats(transactionData.data);

  // Calculate wallet statistics
  const walletStats = calculateWalletStats(walletData.data);

  return {
    tokens: tokenStats,
    transactions: transactionStats,
    wallets: walletStats,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Calculate token statistics
 * @param {Array} tokenAnalysisData - Token analysis data
 * @returns {Object} Token statistics
 */
function calculateTokenStats(tokenAnalysisData) {
  if (!tokenAnalysisData || tokenAnalysisData.length === 0) {
    return {
      totalTokensAnalyzed: 0,
      suspiciousTokensCount: 0,
      suspiciousTokenPercentage: 0,
      riskLevelDistribution: {
        high: 0,
        medium: 0,
        low: 0,
        none: 0
      }
    };
  }

  // Count suspicious tokens
  let suspiciousTokensCount = 0;
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;
  let noRiskCount = 0;

  tokenAnalysisData.forEach(data => {
    if (!data.result) return;

    // Check if token is suspicious based on dusting percentage
    const isDusting = data.result.dustingPercentage && data.result.dustingPercentage > 0;
    if (isDusting) {
      suspiciousTokensCount++;

      // Categorize by risk level
      const dustingPercentage = data.result.dustingPercentage;
      if (dustingPercentage >= 50) {
        highRiskCount++;
      } else if (dustingPercentage >= 20) {
        mediumRiskCount++;
      } else if (dustingPercentage > 0) {
        lowRiskCount++;
      }
    } else {
      noRiskCount++;
    }
  });

  return {
    totalTokensAnalyzed: tokenAnalysisData.length,
    suspiciousTokensCount,
    suspiciousTokenPercentage: (suspiciousTokensCount / tokenAnalysisData.length) * 100,
    riskLevelDistribution: {
      high: highRiskCount,
      medium: mediumRiskCount,
      low: lowRiskCount,
      none: noRiskCount
    }
  };
}

/**
 * Calculate transaction statistics
 * @param {Array} transactionAnalysisData - Transaction analysis data
 * @returns {Object} Transaction statistics
 */
function calculateTransactionStats(transactionAnalysisData) {
  if (!transactionAnalysisData || transactionAnalysisData.length === 0) {
    return {
      totalTransactionsAnalyzed: 0,
      dustingTransactionsCount: 0,
      dustingTransactionPercentage: 0,
      attackVectorDistribution: {
        SOL_DUST: 0,
        TOKEN_DUST: 0,
        MIXED_DUST: 0,
        OTHER: 0
      }
    };
  }

  // Count dusting transactions
  let dustingTransactionsCount = 0;
  let solDustCount = 0;
  let tokenDustCount = 0;
  let mixedDustCount = 0;
  let otherCount = 0;

  transactionAnalysisData.forEach(data => {
    if (!data.result) return;

    if (data.result.isDusting) {
      dustingTransactionsCount++;

      // Categorize by attack vector
      const attackVector = data.result.primaryAttackVector;
      if (attackVector === 'SOL_DUST') {
        solDustCount++;
      } else if (attackVector === 'TOKEN_DUST') {
        tokenDustCount++;
      } else if (attackVector === 'MIXED_DUST') {
        mixedDustCount++;
      } else {
        otherCount++;
      }
    }
  });

  return {
    totalTransactionsAnalyzed: transactionAnalysisData.length,
    dustingTransactionsCount,
    dustingTransactionPercentage: (dustingTransactionsCount / transactionAnalysisData.length) * 100,
    attackVectorDistribution: {
      SOL_DUST: solDustCount,
      TOKEN_DUST: tokenDustCount,
      MIXED_DUST: mixedDustCount,
      OTHER: otherCount
    }
  };
}

/**
 * Calculate wallet statistics
 * @param {Array} walletAnalysisData - Wallet analysis data
 * @returns {Object} Wallet statistics
 */
function calculateWalletStats(walletAnalysisData) {
  if (!walletAnalysisData || walletAnalysisData.length === 0) {
    return {
      totalWalletsAnalyzed: 0,
      victimWalletsCount: 0,
      victimWalletPercentage: 0,
      attackerWalletsCount: 0,
      attackerWalletPercentage: 0
    };
  }

  // Count victim and attacker wallets
  let victimWalletsCount = 0;
  let attackerWalletsCount = 0;

  walletAnalysisData.forEach(data => {
    if (!data.result) return;

    if (data.result.isVictim) {
      victimWalletsCount++;
    }

    if (data.result.isAttacker) {
      attackerWalletsCount++;
    }
  });

  return {
    totalWalletsAnalyzed: walletAnalysisData.length,
    victimWalletsCount,
    victimWalletPercentage: (victimWalletsCount / walletAnalysisData.length) * 100,
    attackerWalletsCount,
    attackerWalletPercentage: (attackerWalletsCount / walletAnalysisData.length) * 100
  };
}

/**
 * Get time series data for dashboard charts
 * @param {string} dataType - Type of data (tokens, transactions, wallets)
 * @param {string} timeframe - Timeframe for grouping (day, week, month)
 * @returns {Object} Time series data
 */
function getTimeSeriesData(dataType, timeframe = 'day') {
  let dataFile;

  // Determine which data file to use
  switch (dataType) {
    case 'tokens':
      dataFile = TOKEN_ANALYSIS_FILE;
      break;
    case 'transactions':
      dataFile = TRANSACTION_ANALYSIS_FILE;
      break;
    case 'wallets':
      dataFile = WALLET_ANALYSIS_FILE;
      break;
    default:
      throw new Error(`Invalid data type: ${dataType}`);
  }

  // Read data
  const storageData = readData(dataFile);
  const analysisData = storageData.data;

  if (!analysisData || analysisData.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  // Group data by timeframe
  const groupedData = groupDataByTimeframe(analysisData, timeframe);

  // Format data for charts
  return formatTimeSeriesData(groupedData, dataType);
}

/**
 * Group data by timeframe
 * @param {Array} data - Data to group
 * @param {string} timeframe - Timeframe for grouping (day, week, month)
 * @returns {Object} Grouped data
 */
function groupDataByTimeframe(data, timeframe) {
  const grouped = {};

  data.forEach(item => {
    const date = new Date(item.timestamp);
    let key;

    // Create key based on timeframe
    switch (timeframe) {
      case 'day':
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'week':
        // Get the first day of the week (Sunday)
        const day = date.getUTCDay();
        const diff = date.getUTCDate() - day;
        const firstDayOfWeek = new Date(date);
        firstDayOfWeek.setUTCDate(diff);
        key = firstDayOfWeek.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = date.toISOString().split('T')[0]; // Default to day
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(item);
  });

  return grouped;
}

/**
 * Format time series data for charts
 * @param {Object} groupedData - Grouped data
 * @param {string} dataType - Type of data (tokens, transactions, wallets)
 * @returns {Object} Formatted time series data
 */
function formatTimeSeriesData(groupedData, dataType) {
  const labels = Object.keys(groupedData).sort();
  let datasets = [];

  switch (dataType) {
    case 'tokens':
      // Count suspicious tokens by day
      const suspiciousTokens = labels.map(date => {
        const dayData = groupedData[date];
        return dayData.filter(item =>
          item.result &&
          item.result.dustingPercentage &&
          item.result.dustingPercentage > 0
        ).length;
      });

      // Count total tokens by day
      const totalTokens = labels.map(date => groupedData[date].length);

      datasets = [
        {
          label: 'Suspicious Tokens',
          data: suspiciousTokens,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1
        },
        {
          label: 'Total Tokens Analyzed',
          data: totalTokens,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }
      ];
      break;

    case 'transactions':
      // Count dusting transactions by day
      const dustingTransactions = labels.map(date => {
        const dayData = groupedData[date];
        return dayData.filter(item =>
          item.result &&
          item.result.isDusting
        ).length;
      });

      // Count total transactions by day
      const totalTransactions = labels.map(date => groupedData[date].length);

      datasets = [
        {
          label: 'Dusting Transactions',
          data: dustingTransactions,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1
        },
        {
          label: 'Total Transactions Analyzed',
          data: totalTransactions,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }
      ];
      break;

    case 'wallets':
      // Count victim wallets by day
      const victimWallets = labels.map(date => {
        const dayData = groupedData[date];
        return dayData.filter(item =>
          item.result &&
          item.result.isVictim
        ).length;
      });

      // Count attacker wallets by day
      const attackerWallets = labels.map(date => {
        const dayData = groupedData[date];
        return dayData.filter(item =>
          item.result &&
          item.result.isAttacker
        ).length;
      });

      // Count total wallets by day
      const totalWallets = labels.map(date => groupedData[date].length);

      datasets = [
        {
          label: 'Victim Wallets',
          data: victimWallets,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1
        },
        {
          label: 'Attacker Wallets',
          data: attackerWallets,
          backgroundColor: 'rgba(255, 206, 86, 0.5)',
          borderColor: 'rgb(255, 206, 86)',
          borderWidth: 1
        },
        {
          label: 'Total Wallets Analyzed',
          data: totalWallets,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }
      ];
      break;
  }

  return {
    labels,
    datasets
  };
}

module.exports = {
  initializeDataStorage,
  collectTokenAnalysisData,
  collectTransactionAnalysisData,
  collectWalletAnalysisData,
  getDashboardStats,
  getTimeSeriesData
};
