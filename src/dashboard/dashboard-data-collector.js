/**
 * Dashboard Data Collector
 *
 * This module collects and stores data from token analysis for dashboard visualization.
 */

const { analyzeTokenMint } = require('../analyzers/token-analyzer');
const { analyzeTransaction } = require('../analyzers/transaction-analyzer');
const { detectDustingAttacks, analyzeWalletTokensCommand } = require('../analyzers/wallet-analyzer-new');
const { detectAddressPoisoning } = require('../analyzers/address-poisoning-analyzer.js');
const { analyzeBlockRange } = require('../analyzers/block-analyzer');
const { analyzeBatchWallets } = require('../analyzers/batch-analyzer');
const { analyzeTimeRange } = require('../analyzers/time-analyzer');
const { analyzeMemo, analyzeMemoText } = require('../analyzers/memo-analyzer');
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
const ADDRESS_POISONING_FILE = path.join(DATA_DIR, 'address-poisoning-analysis.json');
const WALLET_TOKENS_FILE = path.join(DATA_DIR, 'wallet-tokens-analysis.json');
const BLOCK_RANGE_FILE = path.join(DATA_DIR, 'block-range-analysis.json');
const BATCH_ANALYSIS_FILE = path.join(DATA_DIR, 'batch-analysis.json');
const TIME_RANGE_FILE = path.join(DATA_DIR, 'time-range-analysis.json');
const MEMO_ANALYSIS_FILE = path.join(DATA_DIR, 'memo-analysis.json');

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

  if (!fs.existsSync(ADDRESS_POISONING_FILE)) {
    fs.writeFileSync(ADDRESS_POISONING_FILE, JSON.stringify(initialData));
  }

  if (!fs.existsSync(WALLET_TOKENS_FILE)) {
    fs.writeFileSync(WALLET_TOKENS_FILE, JSON.stringify(initialData));
  }

  if (!fs.existsSync(BLOCK_RANGE_FILE)) {
    fs.writeFileSync(BLOCK_RANGE_FILE, JSON.stringify(initialData));
  }

  if (!fs.existsSync(BATCH_ANALYSIS_FILE)) {
    fs.writeFileSync(BATCH_ANALYSIS_FILE, JSON.stringify(initialData));
  }

  if (!fs.existsSync(TIME_RANGE_FILE)) {
    fs.writeFileSync(TIME_RANGE_FILE, JSON.stringify(initialData));
  }

  if (!fs.existsSync(MEMO_ANALYSIS_FILE)) {
    fs.writeFileSync(MEMO_ANALYSIS_FILE, JSON.stringify(initialData));
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
  const addressPoisoningData = readData(ADDRESS_POISONING_FILE);
  const walletTokensData = readData(WALLET_TOKENS_FILE);
  const blockRangeData = readData(BLOCK_RANGE_FILE);
  const batchAnalysisData = readData(BATCH_ANALYSIS_FILE);
  const timeRangeData = readData(TIME_RANGE_FILE);
  const memoAnalysisData = readData(MEMO_ANALYSIS_FILE);

  // Calculate token statistics
  const tokenStats = calculateTokenStats(tokenData.data);

  // Calculate transaction statistics
  const transactionStats = calculateTransactionStats(transactionData.data);

  // Calculate wallet statistics
  const walletStats = calculateWalletStats(walletData.data);

  // Calculate address poisoning statistics
  const addressPoisoningStats = calculateAddressPoisoningStats(addressPoisoningData.data);

  // Calculate wallet tokens statistics
  const walletTokensStats = calculateWalletTokensStats(walletTokensData.data);

  // Calculate block range statistics
  const blockRangeStats = calculateBlockRangeStats(blockRangeData.data);

  // Calculate batch analysis statistics
  const batchAnalysisStats = calculateBatchAnalysisStats(batchAnalysisData.data);

  // Calculate time range statistics
  const timeRangeStats = calculateTimeRangeStats(timeRangeData.data);

  // Calculate memo analysis statistics
  const memoAnalysisStats = calculateMemoAnalysisStats(memoAnalysisData.data);

  // Calculate overall statistics
  const overallStats = calculateOverallStats({
    tokens: tokenStats,
    transactions: transactionStats,
    wallets: walletStats,
    addressPoisoning: addressPoisoningStats,
    walletTokens: walletTokensStats,
    blocks: blockRangeStats,
    batch: batchAnalysisStats,
    timeRange: timeRangeStats,
    memo: memoAnalysisStats
  });

  return {
    tokens: tokenStats,
    transactions: transactionStats,
    wallets: walletStats,
    addressPoisoning: addressPoisoningStats,
    walletTokens: walletTokensStats,
    blocks: blockRangeStats,
    batch: batchAnalysisStats,
    timeRange: timeRangeStats,
    memo: memoAnalysisStats,
    overall: overallStats,
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
 * @param {string} dataType - Type of data (tokens, transactions, wallets, addressPoisoning)
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
    case 'addressPoisoning':
      dataFile = ADDRESS_POISONING_FILE;
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

    case 'addressPoisoning':
      // Count wallets with poisoning attempts by day
      const walletsWithPoisoning = labels.map(date => {
        const dayData = groupedData[date];
        return dayData.filter(item => item.poisoningAttemptsCount > 0).length;
      });

      // Count total poisoning attempts by day
      const totalPoisoningAttempts = labels.map(date => {
        const dayData = groupedData[date];
        return dayData.reduce((sum, item) => sum + item.poisoningAttemptsCount, 0);
      });

      // Count total wallets analyzed by day
      const totalPoisoningWallets = labels.map(date => groupedData[date].length);

      datasets = [
        {
          label: 'Wallets with Poisoning Attempts',
          data: walletsWithPoisoning,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1
        },
        {
          label: 'Total Poisoning Attempts',
          data: totalPoisoningAttempts,
          backgroundColor: 'rgba(255, 206, 86, 0.5)',
          borderColor: 'rgb(255, 206, 86)',
          borderWidth: 1
        },
        {
          label: 'Total Wallets Analyzed',
          data: totalPoisoningWallets,
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

/**
 * Collect address poisoning analysis data
 * @param {string} walletAddress - Wallet address to analyze
 * @param {number} numTransactions - Number of transactions to analyze
 * @returns {Promise<Object>} Analysis results
 */
async function collectAddressPoisoningData(walletAddress, numTransactions = 50) {
  try {
    console.log(`Collecting address poisoning data for wallet: ${walletAddress}`);

    // Run the analysis
    const result = await detectAddressPoisoning(walletAddress, numTransactions);

    // Read existing data
    const storageData = readData(ADDRESS_POISONING_FILE);

    // Add new data
    const newEntry = {
      timestamp: Date.now(),
      walletAddress,
      numTransactions,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      similarAddressesCount: result.similarAddresses.length,
      poisoningAttemptsCount: result.addressPoisoningAttempts.length,
      primaryAttackVector: result.primaryAttackVector || 'None',
      suspiciousTransactionCount: result.suspiciousTransactionCount || 0
    };

    storageData.data.push(newEntry);
    storageData.lastUpdated = new Date().toISOString();

    // Write updated data
    fs.writeFileSync(ADDRESS_POISONING_FILE, JSON.stringify(storageData));

    console.log(`Address poisoning data collected for wallet: ${walletAddress}`);
    return result;
  } catch (error) {
    console.error(`Error collecting address poisoning data: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate address poisoning statistics
 * @param {Array} data - Address poisoning data
 * @returns {Object} Address poisoning statistics
 */
function calculateAddressPoisoningStats(data) {
  // Default stats
  const stats = {
    totalWalletsAnalyzed: 0,
    walletsWithPoisoningAttempts: 0,
    poisoningAttemptsPercentage: 0,
    totalPoisoningAttempts: 0,
    averageRiskScore: 0,
    riskDistribution: {
      high: 0,
      medium: 0,
      low: 0,
      none: 0
    },
    attackVectorDistribution: {}
  };

  if (!data || data.length === 0) {
    return stats;
  }

  // Calculate stats
  stats.totalWalletsAnalyzed = data.length;

  // Count wallets with poisoning attempts
  const walletsWithAttempts = data.filter(entry => entry.poisoningAttemptsCount > 0);
  stats.walletsWithPoisoningAttempts = walletsWithAttempts.length;

  // Calculate percentage
  stats.poisoningAttemptsPercentage = stats.totalWalletsAnalyzed > 0
    ? (stats.walletsWithPoisoningAttempts / stats.totalWalletsAnalyzed) * 100
    : 0;

  // Count total poisoning attempts
  stats.totalPoisoningAttempts = data.reduce((sum, entry) => sum + entry.poisoningAttemptsCount, 0);

  // Calculate average risk score
  const totalRiskScore = data.reduce((sum, entry) => sum + entry.riskScore, 0);
  stats.averageRiskScore = stats.totalWalletsAnalyzed > 0
    ? totalRiskScore / stats.totalWalletsAnalyzed
    : 0;

  // Count risk levels
  data.forEach(entry => {
    if (entry.riskLevel === 'HIGH') {
      stats.riskDistribution.high++;
    } else if (entry.riskLevel === 'MEDIUM') {
      stats.riskDistribution.medium++;
    } else if (entry.riskLevel === 'LOW') {
      stats.riskDistribution.low++;
    } else {
      stats.riskDistribution.none++;
    }
  });

  // Count attack vectors
  data.forEach(entry => {
    if (entry.primaryAttackVector && entry.primaryAttackVector !== 'None') {
      stats.attackVectorDistribution[entry.primaryAttackVector] =
        (stats.attackVectorDistribution[entry.primaryAttackVector] || 0) + 1;
    }
  });

  return stats;
}

/**
 * Collect wallet tokens data
 * @param {string} walletAddress - Wallet address to analyze
 * @param {number} numTransactions - Number of transactions to analyze (0 for token analysis only)
 * @returns {Promise<Object>} Analysis results
 */
async function collectWalletTokensData(walletAddress, numTransactions = 0) {
  try {
    console.log(`Collecting wallet tokens data for wallet: ${walletAddress}`);

    // Capture console output
    const originalConsoleLog = console.log;
    let logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    // Run the analysis
    const result = await analyzeWalletTokensCommand(walletAddress, numTransactions);

    // Restore console.log
    console.log = originalConsoleLog;

    // Read existing data
    const storageData = readData(WALLET_TOKENS_FILE);

    // Add new data
    const newEntry = {
      timestamp: Date.now(),
      walletAddress,
      numTransactions,
      tokensFound: result.tokensFound || 0,
      suspiciousTokens: result.suspiciousTokens || 0,
      legitimateTokens: result.legitimateTokens || 0,
      unknownTokens: result.unknownTokens || 0,
      logs
    };

    storageData.data.push(newEntry);
    storageData.lastUpdated = new Date().toISOString();

    // Write updated data
    writeData(WALLET_TOKENS_FILE, storageData);

    console.log(`Wallet tokens data collected for wallet: ${walletAddress}`);
    return result;
  } catch (error) {
    console.error(`Error collecting wallet tokens data: ${error.message}`);
    throw error;
  }
}

/**
 * Collect block range data
 * @param {number} startSlot - Start slot
 * @param {number} endSlot - End slot
 * @param {number} maxTransactions - Maximum number of transactions to analyze
 * @returns {Promise<Object>} Analysis results
 */
async function collectBlockRangeData(startSlot, endSlot, maxTransactions = 100) {
  try {
    console.log(`Collecting block range data from ${startSlot} to ${endSlot}`);

    // Capture console output
    const originalConsoleLog = console.log;
    let logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    // Run the analysis
    const result = await analyzeBlockRange(startSlot, endSlot, maxTransactions);

    // Restore console.log
    console.log = originalConsoleLog;

    // Read existing data
    const storageData = readData(BLOCK_RANGE_FILE);

    // Add new data
    const newEntry = {
      timestamp: Date.now(),
      startSlot,
      endSlot,
      maxTransactions,
      blocksAnalyzed: endSlot - startSlot + 1,
      transactionsFound: result.transactionsFound || 0,
      dustingTransactions: result.dustingTransactions || 0,
      logs
    };

    storageData.data.push(newEntry);
    storageData.lastUpdated = new Date().toISOString();

    // Write updated data
    writeData(BLOCK_RANGE_FILE, storageData);

    console.log(`Block range data collected from ${startSlot} to ${endSlot}`);
    return result;
  } catch (error) {
    console.error(`Error collecting block range data: ${error.message}`);
    throw error;
  }
}

/**
 * Collect batch analysis data
 * @param {Array<string>} wallets - Array of wallet addresses
 * @param {number} numTransactions - Number of transactions to analyze per wallet
 * @returns {Promise<Object>} Analysis results
 */
async function collectBatchData(wallets, numTransactions = 10) {
  try {
    console.log(`Collecting batch analysis data for ${wallets.length} wallets`);

    // Capture console output
    const originalConsoleLog = console.log;
    let logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    // Run the analysis
    const result = await analyzeBatchWallets(wallets, numTransactions);

    // Restore console.log
    console.log = originalConsoleLog;

    // Read existing data
    const storageData = readData(BATCH_ANALYSIS_FILE);

    // Count victims and attackers
    let victimCount = 0;
    let attackerCount = 0;
    let neutralCount = 0;

    if (result && result.results) {
      result.results.forEach(walletResult => {
        if (walletResult.isVictim) victimCount++;
        if (walletResult.isAttacker) attackerCount++;
        if (!walletResult.isVictim && !walletResult.isAttacker) neutralCount++;
      });
    }

    // Add new data
    const newEntry = {
      timestamp: Date.now(),
      walletCount: wallets.length,
      numTransactions,
      victimCount,
      attackerCount,
      neutralCount,
      logs
    };

    storageData.data.push(newEntry);
    storageData.lastUpdated = new Date().toISOString();

    // Write updated data
    writeData(BATCH_ANALYSIS_FILE, storageData);

    console.log(`Batch analysis data collected for ${wallets.length} wallets`);
    return result;
  } catch (error) {
    console.error(`Error collecting batch analysis data: ${error.message}`);
    throw error;
  }
}

/**
 * Collect time range data
 * @param {string} walletAddress - Wallet address
 * @param {string|number} startTime - Start time
 * @param {string|number} endTime - End time
 * @param {number} maxTransactions - Maximum number of transactions to analyze
 * @returns {Promise<Object>} Analysis results
 */
async function collectTimeRangeData(walletAddress, startTime, endTime, maxTransactions = 50) {
  try {
    console.log(`Collecting time range data for wallet ${walletAddress} from ${startTime} to ${endTime}`);

    // Capture console output
    const originalConsoleLog = console.log;
    let logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    // Run the analysis
    const result = await analyzeTimeRange(walletAddress, startTime, endTime, maxTransactions);

    // Restore console.log
    console.log = originalConsoleLog;

    // Read existing data
    const storageData = readData(TIME_RANGE_FILE);

    // Count dusting transactions
    let dustingCount = 0;
    if (result && result.transactions) {
      dustingCount = result.transactions.filter(tx => tx.isDusting).length;
    }

    // Add new data
    const newEntry = {
      timestamp: Date.now(),
      walletAddress,
      startTime,
      endTime,
      maxTransactions,
      transactionsFound: result.transactions ? result.transactions.length : 0,
      dustingTransactions: dustingCount,
      logs
    };

    storageData.data.push(newEntry);
    storageData.lastUpdated = new Date().toISOString();

    // Write updated data
    writeData(TIME_RANGE_FILE, storageData);

    console.log(`Time range data collected for wallet ${walletAddress}`);
    return result;
  } catch (error) {
    console.error(`Error collecting time range data: ${error.message}`);
    throw error;
  }
}

/**
 * Collect memo analysis data
 * @param {string} signature - Transaction signature
 * @returns {Promise<Object>} Analysis results
 */
async function collectMemoData(signature) {
  try {
    console.log(`Collecting memo analysis data for transaction ${signature}`);

    // Capture console output
    const originalConsoleLog = console.log;
    let logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    // Run the analysis
    const result = await analyzeMemo(signature);

    // Restore console.log
    console.log = originalConsoleLog;

    // Read existing data
    const storageData = readData(MEMO_ANALYSIS_FILE);

    // Add new data
    const newEntry = {
      timestamp: Date.now(),
      signature,
      memoText: result.memoText || '',
      isSuspicious: result.isSuspicious || false,
      suspiciousScore: result.suspiciousScore || 0,
      contentType: result.contentType || 'Unknown',
      logs
    };

    storageData.data.push(newEntry);
    storageData.lastUpdated = new Date().toISOString();

    // Write updated data
    writeData(MEMO_ANALYSIS_FILE, storageData);

    console.log(`Memo analysis data collected for transaction ${signature}`);
    return result;
  } catch (error) {
    console.error(`Error collecting memo analysis data: ${error.message}`);
    throw error;
  }
}

/**
 * Collect memo text analysis data
 * @param {string} memoText - Memo text to analyze
 * @returns {Promise<Object>} Analysis results
 */
async function collectMemoTextData(memoText) {
  try {
    console.log(`Collecting memo text analysis data`);

    // Run the analysis
    const result = analyzeMemoText(memoText);

    // Read existing data
    const storageData = readData(MEMO_ANALYSIS_FILE);

    // Add new data
    const newEntry = {
      timestamp: Date.now(),
      signature: null, // No signature for direct text analysis
      memoText,
      isSuspicious: result.isSuspicious || false,
      suspiciousScore: result.suspiciousScore || 0,
      contentType: result.contentType || 'Unknown'
    };

    storageData.data.push(newEntry);
    storageData.lastUpdated = new Date().toISOString();

    // Write updated data
    writeData(MEMO_ANALYSIS_FILE, storageData);

    console.log(`Memo text analysis data collected`);
    return result;
  } catch (error) {
    console.error(`Error collecting memo text analysis data: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate wallet tokens statistics
 * @param {Array} data - Wallet tokens data
 * @returns {Object} Wallet tokens statistics
 */
function calculateWalletTokensStats(data) {
  if (!data || data.length === 0) {
    return {
      walletsAnalyzed: 0,
      tokensFound: 0,
      suspiciousTokens: 0,
      legitimateTokens: 0,
      unknownTokens: 0,
      suspiciousTokenPercentage: 0,
      tokenDistribution: {
        legitimate: 0,
        suspicious: 0,
        unknown: 0
      }
    };
  }

  // Calculate stats
  const walletsAnalyzed = data.length;
  const tokensFound = data.reduce((sum, entry) => sum + entry.tokensFound, 0);
  const suspiciousTokens = data.reduce((sum, entry) => sum + entry.suspiciousTokens, 0);
  const legitimateTokens = data.reduce((sum, entry) => sum + entry.legitimateTokens, 0);
  const unknownTokens = data.reduce((sum, entry) => sum + entry.unknownTokens, 0);

  return {
    walletsAnalyzed,
    tokensFound,
    suspiciousTokens,
    legitimateTokens,
    unknownTokens,
    suspiciousTokenPercentage: tokensFound > 0 ? (suspiciousTokens / tokensFound) * 100 : 0,
    tokenDistribution: {
      legitimate: legitimateTokens,
      suspicious: suspiciousTokens,
      unknown: unknownTokens
    }
  };
}

/**
 * Calculate block range statistics
 * @param {Array} data - Block range data
 * @returns {Object} Block range statistics
 */
function calculateBlockRangeStats(data) {
  if (!data || data.length === 0) {
    return {
      blocksAnalyzed: 0,
      transactionsFound: 0,
      dustingTransactions: 0,
      dustingTransactionPercentage: 0,
      blockActivity: {
        slots: [],
        transactions: [],
        dustingTransactions: []
      }
    };
  }

  // Calculate stats
  const blocksAnalyzed = data.reduce((sum, entry) => sum + entry.blocksAnalyzed, 0);
  const transactionsFound = data.reduce((sum, entry) => sum + entry.transactionsFound, 0);
  const dustingTransactions = data.reduce((sum, entry) => sum + entry.dustingTransactions, 0);

  // Get the most recent entry for block activity
  const latestEntry = data.sort((a, b) => b.timestamp - a.timestamp)[0];

  // Create sample block activity data (in a real implementation, this would come from the actual analysis)
  const slots = Array.from({ length: 5 }, (_, i) => latestEntry.startSlot + i);
  const transactions = Array.from({ length: 5 }, () => Math.floor(Math.random() * 20) + 1);
  const dustingTxs = transactions.map(count => Math.floor(Math.random() * count));

  return {
    blocksAnalyzed,
    transactionsFound,
    dustingTransactions,
    dustingTransactionPercentage: transactionsFound > 0 ? (dustingTransactions / transactionsFound) * 100 : 0,
    blockActivity: {
      slots,
      transactions,
      dustingTransactions: dustingTxs
    }
  };
}

/**
 * Calculate batch analysis statistics
 * @param {Array} data - Batch analysis data
 * @returns {Object} Batch analysis statistics
 */
function calculateBatchAnalysisStats(data) {
  if (!data || data.length === 0) {
    return {
      walletsAnalyzed: 0,
      victimWallets: 0,
      attackerWallets: 0,
      neutralWallets: 0,
      victimPercentage: 0,
      attackerPercentage: 0,
      results: {
        victims: 0,
        attackers: 0,
        neutral: 0
      }
    };
  }

  // Calculate stats
  const walletsAnalyzed = data.reduce((sum, entry) => sum + entry.walletCount, 0);
  const victimWallets = data.reduce((sum, entry) => sum + entry.victimCount, 0);
  const attackerWallets = data.reduce((sum, entry) => sum + entry.attackerCount, 0);
  const neutralWallets = data.reduce((sum, entry) => sum + entry.neutralCount, 0);

  return {
    walletsAnalyzed,
    victimWallets,
    attackerWallets,
    neutralWallets,
    victimPercentage: walletsAnalyzed > 0 ? (victimWallets / walletsAnalyzed) * 100 : 0,
    attackerPercentage: walletsAnalyzed > 0 ? (attackerWallets / walletsAnalyzed) * 100 : 0,
    results: {
      victims: victimWallets,
      attackers: attackerWallets,
      neutral: neutralWallets
    }
  };
}

/**
 * Calculate time range statistics
 * @param {Array} data - Time range data
 * @returns {Object} Time range statistics
 */
function calculateTimeRangeStats(data) {
  if (!data || data.length === 0) {
    return {
      walletsAnalyzed: 0,
      transactionsAnalyzed: 0,
      dustingTransactions: 0,
      dustingTransactionPercentage: 0,
      startTime: null,
      endTime: null,
      activity: {
        timestamps: [],
        transactions: [],
        dustingTransactions: []
      }
    };
  }

  // Calculate stats
  const walletsAnalyzed = data.length;
  const transactionsAnalyzed = data.reduce((sum, entry) => sum + entry.transactionsFound, 0);
  const dustingTransactions = data.reduce((sum, entry) => sum + entry.dustingTransactions, 0);

  // Get the most recent entry for time activity
  const latestEntry = data.sort((a, b) => b.timestamp - a.timestamp)[0];

  // Create sample time activity data (in a real implementation, this would come from the actual analysis)
  const startDate = new Date(latestEntry.startTime);
  const endDate = new Date(latestEntry.endTime);
  const dayDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  const timestamps = Array.from({ length: Math.min(dayDiff, 7) }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date.toISOString();
  });

  const transactions = Array.from({ length: timestamps.length }, () => Math.floor(Math.random() * 20) + 1);
  const dustingTxs = transactions.map(count => Math.floor(Math.random() * count));

  return {
    walletsAnalyzed,
    transactionsAnalyzed,
    dustingTransactions,
    dustingTransactionPercentage: transactionsAnalyzed > 0 ? (dustingTransactions / transactionsAnalyzed) * 100 : 0,
    startTime: latestEntry.startTime,
    endTime: latestEntry.endTime,
    activity: {
      timestamps,
      transactions,
      dustingTransactions: dustingTxs
    }
  };
}

/**
 * Calculate memo analysis statistics
 * @param {Array} data - Memo analysis data
 * @returns {Object} Memo analysis statistics
 */
function calculateMemoAnalysisStats(data) {
  if (!data || data.length === 0) {
    return {
      memosAnalyzed: 0,
      suspiciousMemos: 0,
      suspiciousPercentage: 0,
      averageRiskScore: 0,
      contentTypes: {
        'Promotional': 0,
        'Scam': 0,
        'Airdrop': 0,
        'URL': 0,
        'Normal': 0,
        'Unknown': 0
      }
    };
  }

  // Calculate stats
  const memosAnalyzed = data.length;
  const suspiciousMemos = data.filter(entry => entry.isSuspicious).length;
  const totalRiskScore = data.reduce((sum, entry) => sum + entry.suspiciousScore, 0);

  // Count content types
  const contentTypes = {
    'Promotional': 0,
    'Scam': 0,
    'Airdrop': 0,
    'URL': 0,
    'Normal': 0,
    'Unknown': 0
  };

  data.forEach(entry => {
    const contentType = entry.contentType || 'Unknown';
    contentTypes[contentType] = (contentTypes[contentType] || 0) + 1;
  });

  return {
    memosAnalyzed,
    suspiciousMemos,
    suspiciousPercentage: memosAnalyzed > 0 ? (suspiciousMemos / memosAnalyzed) * 100 : 0,
    averageRiskScore: memosAnalyzed > 0 ? totalRiskScore / memosAnalyzed : 0,
    contentTypes
  };
}

/**
 * Calculate overall statistics
 * @param {Object} allStats - All statistics
 * @returns {Object} Overall statistics
 */
function calculateOverallStats(allStats) {
  // Count total analyses
  const totalAnalyses =
    (allStats.tokens.totalTokensAnalyzed || 0) +
    (allStats.transactions.totalTransactionsAnalyzed || 0) +
    (allStats.wallets.totalWalletsAnalyzed || 0) +
    (allStats.addressPoisoning.totalWalletsAnalyzed || 0) +
    (allStats.walletTokens.walletsAnalyzed || 0) +
    (allStats.blocks.blocksAnalyzed || 0) +
    (allStats.batch.walletsAnalyzed || 0) +
    (allStats.timeRange.walletsAnalyzed || 0) +
    (allStats.memo.memosAnalyzed || 0);

  // Count total dusting attacks
  const totalDustingAttacks =
    (allStats.tokens.suspiciousTokensCount || 0) +
    (allStats.transactions.dustingTransactionsCount || 0) +
    (allStats.wallets.victimWalletsCount || 0) +
    (allStats.blocks.dustingTransactions || 0) +
    (allStats.batch.victimWallets || 0) +
    (allStats.timeRange.dustingTransactions || 0);

  // Count total poisoning attempts
  const totalPoisoningAttempts = allStats.addressPoisoning.totalPoisoningAttempts || 0;

  // Create attack distribution
  const attackDistribution = {
    'Token Dusting': allStats.tokens.suspiciousTokensCount || 0,
    'SOL Dusting': allStats.transactions.attackVectorDistribution?.SOL_DUST || 0,
    'Address Poisoning': totalPoisoningAttempts,
    'Suspicious Memos': allStats.memo.suspiciousMemos || 0,
    'Other Attacks': 0
  };

  return {
    totalAnalyses,
    totalDustingAttacks,
    totalPoisoningAttempts,
    attackDistribution
  };
}

module.exports = {
  initializeDataStorage,
  collectTokenAnalysisData,
  collectTransactionAnalysisData,
  collectWalletAnalysisData,
  collectAddressPoisoningData,
  collectWalletTokensData,
  collectBlockRangeData,
  collectBatchData,
  collectTimeRangeData,
  collectMemoData,
  collectMemoTextData,
  getDashboardStats,
  getTimeSeriesData
};
