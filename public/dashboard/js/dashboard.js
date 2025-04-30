/**
 * Solana Spam Detector Dashboard
 * 
 * This script handles the dashboard functionality, including:
 * - Loading and displaying dashboard statistics
 * - Rendering charts for visualizing data
 * - Handling form submissions for data collection
 */

// Global variables for charts
let attackVectorChart = null;
let walletClassificationChart = null;
let tokensTimeSeriesChart = null;
let transactionsTimeSeriesChart = null;
let walletsTimeSeriesChart = null;

// Current timeframe for time series charts
let currentTimeframe = 'day';

// API base URL
const API_BASE_URL = '/v1/api';

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the dashboard
  initializeDashboard();
  
  // Set up event listeners
  setupEventListeners();
});

/**
 * Initialize the dashboard
 */
function initializeDashboard() {
  // Show loading status
  showStatus('Loading dashboard data...', true);
  
  // Load dashboard statistics
  loadDashboardStats()
    .then(() => {
      // Load time series data for each chart
      return Promise.all([
        loadTimeSeriesData('tokens', currentTimeframe),
        loadTimeSeriesData('transactions', currentTimeframe),
        loadTimeSeriesData('wallets', currentTimeframe)
      ]);
    })
    .then(() => {
      // Hide loading status
      hideStatus();
    })
    .catch(error => {
      console.error('Error initializing dashboard:', error);
      showStatus('Error loading dashboard data. Please try again.', false);
    });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Token analysis form
  document.getElementById('tokenForm').addEventListener('submit', event => {
    event.preventDefault();
    collectTokenData();
  });
  
  // Transaction analysis form
  document.getElementById('transactionForm').addEventListener('submit', event => {
    event.preventDefault();
    collectTransactionData();
  });
  
  // Wallet analysis form
  document.getElementById('walletForm').addEventListener('submit', event => {
    event.preventDefault();
    collectWalletData();
  });
  
  // Timeframe buttons
  document.querySelectorAll('[data-timeframe]').forEach(button => {
    button.addEventListener('click', event => {
      // Update active button
      document.querySelectorAll('[data-timeframe]').forEach(btn => {
        btn.classList.remove('active');
      });
      event.target.classList.add('active');
      
      // Update timeframe and reload data
      currentTimeframe = event.target.dataset.timeframe;
      
      // Get active tab
      const activeTab = document.querySelector('#timeSeriesTabs .nav-link.active');
      const dataType = activeTab.id.replace('-tab', '');
      
      // Load time series data for active tab
      loadTimeSeriesData(dataType, currentTimeframe);
    });
  });
  
  // Time series tabs
  document.querySelectorAll('#timeSeriesTabs .nav-link').forEach(tab => {
    tab.addEventListener('shown.bs.tab', event => {
      const dataType = event.target.id.replace('-tab', '');
      loadTimeSeriesData(dataType, currentTimeframe);
    });
  });
}

/**
 * Load dashboard statistics
 */
async function loadDashboardStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
    const data = await response.json();
    
    if (data.success) {
      // Update dashboard stats
      updateDashboardStats(data.data);
    } else {
      console.error('Error loading dashboard stats:', data.error);
      showStatus('Error loading dashboard statistics.', false);
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}

/**
 * Load time series data
 * @param {string} dataType - Type of data (tokens, transactions, wallets)
 * @param {string} timeframe - Timeframe for grouping (day, week, month)
 */
async function loadTimeSeriesData(dataType, timeframe) {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/time-series?dataType=${dataType}&timeframe=${timeframe}`);
    const data = await response.json();
    
    if (data.success) {
      // Update time series chart
      updateTimeSeriesChart(dataType, data.data);
    } else {
      console.error(`Error loading ${dataType} time series data:`, data.error);
    }
  } catch (error) {
    console.error(`Error fetching ${dataType} time series data:`, error);
    throw error;
  }
}

/**
 * Update dashboard statistics
 * @param {Object} stats - Dashboard statistics
 */
function updateDashboardStats(stats) {
  // Update last updated timestamp
  document.getElementById('lastUpdated').textContent = new Date(stats.lastUpdated).toLocaleString();
  
  // Update token stats
  const tokenStats = stats.tokens;
  document.getElementById('totalTokensAnalyzed').textContent = tokenStats.totalTokensAnalyzed;
  document.getElementById('suspiciousTokensCount').textContent = tokenStats.suspiciousTokensCount;
  document.getElementById('suspiciousTokenPercentage').textContent = `${tokenStats.suspiciousTokenPercentage.toFixed(1)}%`;
  
  // Update risk level distribution
  const riskDistribution = tokenStats.riskLevelDistribution;
  const totalRisk = riskDistribution.high + riskDistribution.medium + riskDistribution.low + riskDistribution.none;
  
  if (totalRisk > 0) {
    const highPercent = (riskDistribution.high / totalRisk) * 100;
    const mediumPercent = (riskDistribution.medium / totalRisk) * 100;
    const lowPercent = (riskDistribution.low / totalRisk) * 100;
    
    document.getElementById('highRiskProgress').style.width = `${highPercent}%`;
    document.getElementById('mediumRiskProgress').style.width = `${mediumPercent}%`;
    document.getElementById('lowRiskProgress').style.width = `${lowPercent}%`;
  }
  
  document.getElementById('highRiskCount').textContent = riskDistribution.high;
  document.getElementById('mediumRiskCount').textContent = riskDistribution.medium;
  document.getElementById('lowRiskCount').textContent = riskDistribution.low;
  document.getElementById('noRiskCount').textContent = riskDistribution.none;
  
  // Update transaction stats
  const transactionStats = stats.transactions;
  document.getElementById('totalTransactionsAnalyzed').textContent = transactionStats.totalTransactionsAnalyzed;
  document.getElementById('dustingTransactionsCount').textContent = transactionStats.dustingTransactionsCount;
  document.getElementById('dustingTransactionPercentage').textContent = `${transactionStats.dustingTransactionPercentage.toFixed(1)}%`;
  
  // Update attack vector chart
  updateAttackVectorChart(transactionStats.attackVectorDistribution);
  
  // Update wallet stats
  const walletStats = stats.wallets;
  document.getElementById('totalWalletsAnalyzed').textContent = walletStats.totalWalletsAnalyzed;
  document.getElementById('victimWalletsCount').textContent = walletStats.victimWalletsCount;
  document.getElementById('attackerWalletsCount').textContent = walletStats.attackerWalletsCount;
  
  // Update wallet classification chart
  updateWalletClassificationChart(walletStats);
}

/**
 * Update attack vector chart
 * @param {Object} distribution - Attack vector distribution
 */
function updateAttackVectorChart(distribution) {
  const ctx = document.getElementById('attackVectorChart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (attackVectorChart) {
    attackVectorChart.destroy();
  }
  
  // Create new chart
  attackVectorChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['SOL Dust', 'Token Dust', 'Mixed Dust', 'Other'],
      datasets: [{
        data: [
          distribution.SOL_DUST,
          distribution.TOKEN_DUST,
          distribution.MIXED_DUST,
          distribution.OTHER
        ],
        backgroundColor: [
          '#14F195', // Green
          '#9945FF', // Purple
          '#00C2FF', // Blue
          '#F1A208'  // Orange
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 10
          }
        }
      }
    }
  });
}

/**
 * Update wallet classification chart
 * @param {Object} walletStats - Wallet statistics
 */
function updateWalletClassificationChart(walletStats) {
  const ctx = document.getElementById('walletClassificationChart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (walletClassificationChart) {
    walletClassificationChart.destroy();
  }
  
  // Create new chart
  walletClassificationChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Victims', 'Attackers', 'Neutral'],
      datasets: [{
        data: [
          walletStats.victimWalletsCount,
          walletStats.attackerWalletsCount,
          walletStats.totalWalletsAnalyzed - walletStats.victimWalletsCount - walletStats.attackerWalletsCount
        ],
        backgroundColor: [
          '#FF6B6B', // Red for victims
          '#4D4DFF', // Blue for attackers
          '#AAAAAA'  // Gray for neutral
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 10
          }
        }
      }
    }
  });
}

/**
 * Update time series chart
 * @param {string} dataType - Type of data (tokens, transactions, wallets)
 * @param {Object} chartData - Chart data
 */
function updateTimeSeriesChart(dataType, chartData) {
  let chart;
  let chartId;
  
  // Determine which chart to update
  switch (dataType) {
    case 'tokens':
      chart = tokensTimeSeriesChart;
      chartId = 'tokensTimeSeriesChart';
      break;
    case 'transactions':
      chart = transactionsTimeSeriesChart;
      chartId = 'transactionsTimeSeriesChart';
      break;
    case 'wallets':
      chart = walletsTimeSeriesChart;
      chartId = 'walletsTimeSeriesChart';
      break;
    default:
      console.error(`Invalid data type: ${dataType}`);
      return;
  }
  
  const ctx = document.getElementById(chartId).getContext('2d');
  
  // Destroy existing chart if it exists
  if (chart) {
    chart.destroy();
  }
  
  // Format dates for display
  const formattedLabels = chartData.labels.map(label => {
    const date = new Date(label);
    
    // Format based on timeframe
    switch (currentTimeframe) {
      case 'day':
        return date.toLocaleDateString();
      case 'week':
        return `Week of ${date.toLocaleDateString()}`;
      case 'month':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      default:
        return label;
    }
  });
  
  // Create new chart
  const newChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: formattedLabels,
      datasets: chartData.datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
  
  // Update global chart reference
  switch (dataType) {
    case 'tokens':
      tokensTimeSeriesChart = newChart;
      break;
    case 'transactions':
      transactionsTimeSeriesChart = newChart;
      break;
    case 'wallets':
      walletsTimeSeriesChart = newChart;
      break;
  }
}

/**
 * Collect token data
 */
async function collectTokenData() {
  const tokenMint = document.getElementById('tokenMint').value.trim();
  const maxTransactions = parseInt(document.getElementById('tokenMaxTransactions').value);
  
  if (!tokenMint) {
    showStatus('Token mint address is required.', false);
    return;
  }
  
  showStatus(`Analyzing token ${tokenMint}...`, true);
  
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/collect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tokenMint,
        maxTransactions
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showStatus(`Token analysis complete for ${tokenMint}.`, false);
      
      // Reload dashboard data
      setTimeout(() => {
        initializeDashboard();
      }, 1000);
    } else {
      showStatus(`Error analyzing token: ${data.error}`, false);
    }
  } catch (error) {
    console.error('Error collecting token data:', error);
    showStatus('Error analyzing token. Please try again.', false);
  }
}

/**
 * Collect transaction data
 */
async function collectTransactionData() {
  const signature = document.getElementById('transactionSignature').value.trim();
  
  if (!signature) {
    showStatus('Transaction signature is required.', false);
    return;
  }
  
  showStatus(`Analyzing transaction ${signature.substring(0, 8)}...`, true);
  
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/collect/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        signature
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showStatus(`Transaction analysis complete for ${signature.substring(0, 8)}...`, false);
      
      // Reload dashboard data
      setTimeout(() => {
        initializeDashboard();
      }, 1000);
    } else {
      showStatus(`Error analyzing transaction: ${data.error}`, false);
    }
  } catch (error) {
    console.error('Error collecting transaction data:', error);
    showStatus('Error analyzing transaction. Please try again.', false);
  }
}

/**
 * Collect wallet data
 */
async function collectWalletData() {
  const walletAddress = document.getElementById('walletAddress').value.trim();
  const numTransactions = parseInt(document.getElementById('walletNumTransactions').value);
  
  if (!walletAddress) {
    showStatus('Wallet address is required.', false);
    return;
  }
  
  showStatus(`Analyzing wallet ${walletAddress.substring(0, 8)}...`, true);
  
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/collect/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress,
        numTransactions
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showStatus(`Wallet analysis complete for ${walletAddress.substring(0, 8)}...`, false);
      
      // Reload dashboard data
      setTimeout(() => {
        initializeDashboard();
      }, 1000);
    } else {
      showStatus(`Error analyzing wallet: ${data.error}`, false);
    }
  } catch (error) {
    console.error('Error collecting wallet data:', error);
    showStatus('Error analyzing wallet. Please try again.', false);
  }
}

/**
 * Show status message
 * @param {string} message - Status message
 * @param {boolean} loading - Whether to show loading spinner
 */
function showStatus(message, loading) {
  const statusElement = document.getElementById('statusMessages');
  const statusTextElement = document.getElementById('statusText');
  
  statusTextElement.textContent = message;
  statusElement.classList.remove('d-none', 'alert-info', 'alert-success', 'alert-danger');
  
  if (loading) {
    statusElement.classList.add('alert-info');
    statusElement.querySelector('.spinner-border').classList.remove('d-none');
  } else {
    statusElement.classList.add('alert-success');
    statusElement.querySelector('.spinner-border').classList.add('d-none');
    
    // Hide status after 5 seconds
    setTimeout(() => {
      statusElement.classList.add('d-none');
    }, 5000);
  }
}

/**
 * Hide status message
 */
function hideStatus() {
  document.getElementById('statusMessages').classList.add('d-none');
}
