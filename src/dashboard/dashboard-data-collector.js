/**
 * Dashboard Data Collector
 *
 * This module collects and stores data from token analysis for dashboard visualization.
 */

const { analyzeTokenMint } = require('../analyzers/token-analyzer');
const { analyzeTransaction } = require('../analyzers/transaction-analyzer');
const { detectDustingAttacks } = require('../analyzers/wallet-analyzer');
const { detectAddressPoisoning } = require('../analyzers/address-poisoning-analyzer.js');
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

  // Calculate token statistics
  const tokenStats = calculateTokenStats(tokenData.data);

  // Calculate transaction statistics
  const transactionStats = calculateTransactionStats(transactionData.data);

  // Calculate wallet statistics
  const walletStats = calculateWalletStats(walletData.data);

  // Calculate address poisoning statistics
  const addressPoisoningStats = calculateAddressPoisoningStats(addressPoisoningData.data);

  return {
    tokens: tokenStats,
    transactions: transactionStats,
    wallets: walletStats,
    addressPoisoning: addressPoisoningStats,
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

module.exports = {
  initializeDataStorage,
  collectTokenAnalysisData,
  collectTransactionAnalysisData,
  collectWalletAnalysisData,
  collectAddressPoisoningData,
  getDashboardStats,
  getTimeSeriesData
};
