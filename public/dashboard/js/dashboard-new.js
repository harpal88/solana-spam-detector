/**
 * Solana Spam Detector Dashboard
 */

// API base URL
const API_BASE_URL = '/v1/api';

// Global chart variables
let attackVectorChart = null;
let walletClassificationChart = null;
let poisoningRiskChart = null;
let walletTokensDistributionChart = null;
let blockActivityChart = null;
let batchResultsChart = null;
let memoContentTypeChart = null;
let timeRangeActivityChart = null;
let overallAttackDistributionChart = null;

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing dashboard...');
  
  // Set up tab functionality
  setupTabs();
  
  // Set up form event listeners
  setupFormListeners();
  
  // Load initial data
  loadDashboardData();
});

/**
 * Set up tab functionality
 */
function setupTabs() {
  console.log('Setting up tabs...');
  
  // First tab set (top section)
  const tabLinks1 = document.querySelectorAll('#collectionTabs .nav-link');
  tabLinks1.forEach(tabLink => {
    tabLink.addEventListener('click', function(event) {
      event.preventDefault();
      
      // Remove active class from all tabs
      tabLinks1.forEach(link => {
        link.classList.remove('active');
        const tabPane = document.querySelector(link.getAttribute('data-bs-target'));
        if (tabPane) {
          tabPane.classList.remove('show', 'active');
        }
      });
      
      // Add active class to clicked tab
      this.classList.add('active');
      const targetPane = document.querySelector(this.getAttribute('data-bs-target'));
      if (targetPane) {
        targetPane.classList.add('show', 'active');
      }
    });
  });
  
  // Second tab set (data collection section)
  const tabLinks2 = document.querySelectorAll('#dataCollectionTabs .nav-link');
  tabLinks2.forEach(tabLink => {
    tabLink.addEventListener('click', function(event) {
      event.preventDefault();
      
      // Remove active class from all tabs
      tabLinks2.forEach(link => {
        link.classList.remove('active');
        const tabPane = document.querySelector(link.getAttribute('data-bs-target'));
        if (tabPane) {
          tabPane.classList.remove('show', 'active');
        }
      });
      
      // Add active class to clicked tab
      this.classList.add('active');
      const targetPane = document.querySelector(this.getAttribute('data-bs-target'));
      if (targetPane) {
        targetPane.classList.add('show', 'active');
      }
    });
  });
  
  // Ensure first tab in each set is active
  if (tabLinks1.length > 0) {
    tabLinks1[0].click();
  }
  
  if (tabLinks2.length > 0) {
    tabLinks2[0].click();
  }
}

/**
 * Set up form event listeners
 */
function setupFormListeners() {
  console.log('Setting up form listeners...');
  
  // First set of forms (top section)
  setupFormListener('tokenForm', collectTokenData);
  setupFormListener('transactionForm', collectTransactionData);
  setupFormListener('walletForm', collectWalletData);
  setupFormListener('walletTokensForm', collectWalletTokensData);
  setupFormListener('blocksForm', collectBlockRangeData);
  setupFormListener('batchForm', collectBatchData);
  setupFormListener('timeForm', collectTimeRangeData);
  setupFormListener('memoForm', collectMemoData);
  
  // Second set of forms (data collection section)
  setupFormListener('tokenAnalysisForm', collectTokenData);
  setupFormListener('transactionAnalysisForm', collectTransactionData);
  setupFormListener('walletAnalysisForm', collectWalletData);
  setupFormListener('addressPoisoningForm', collectAddressPoisoningData);
  setupFormListener('walletTokensAnalysisForm', collectWalletTokensData);
  setupFormListener('blocksAnalysisForm', collectBlockRangeData);
  setupFormListener('batchAnalysisForm', collectBatchData);
  setupFormListener('timeAnalysisForm', collectTimeRangeData);
  setupFormListener('memoAnalysisForm', collectMemoData);
  
  // Memo analysis type radio buttons
  setupMemoRadioListeners();
}

/**
 * Set up a form listener
 * @param {string} formId - Form ID
 * @param {Function} handler - Form submit handler
 */
function setupFormListener(formId, handler) {
  const form = document.getElementById(formId);
  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      handler();
    });
  }
}

/**
 * Set up memo radio button listeners
 */
function setupMemoRadioListeners() {
  // First form memo radio buttons
  const memoRadios1 = document.querySelectorAll('#memoForm input[name="memoAnalysisType"]');
  if (memoRadios1.length > 0) {
    memoRadios1.forEach(radio => {
      radio.addEventListener('change', () => {
        const isSignature = radio.value === 'signature';
        toggleElement('memoSignatureInput', isSignature);
        toggleElement('memoTextInput', !isSignature);
      });
    });
  }
  
  // Second form memo radio buttons
  const memoRadios2 = document.querySelectorAll('#memoAnalysisForm input[name="memoAnalysisType"]');
  if (memoRadios2.length > 0) {
    memoRadios2.forEach(radio => {
      radio.addEventListener('change', () => {
        const isSignature = radio.value === 'signature';
        toggleElement('memoCollectionSignatureInput', isSignature);
        toggleElement('memoCollectionTextInput', !isSignature);
      });
    });
  }
}

/**
 * Toggle element visibility
 * @param {string} elementId - Element ID
 * @param {boolean} show - Whether to show the element
 */
function toggleElement(elementId, show) {
  const element = document.getElementById(elementId);
  if (element) {
    if (show) {
      element.classList.remove('d-none');
    } else {
      element.classList.add('d-none');
    }
  }
}

/**
 * Load dashboard data
 */
function loadDashboardData() {
  console.log('Loading dashboard data...');
  showStatus('Loading dashboard data...', true);
  
  fetch(`${API_BASE_URL}/dashboard/stats`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateDashboardStats(data.data);
        showStatus('Dashboard data loaded successfully.', false, 2000);
      } else {
        showStatus(`Error loading dashboard data: ${data.error}`, false);
      }
    })
    .catch(error => {
      console.error('Error loading dashboard data:', error);
      showStatus('Error loading dashboard data. Please try again.', false);
    });
}

/**
 * Update dashboard statistics
 * @param {Object} stats - Dashboard statistics
 */
function updateDashboardStats(stats) {
  console.log('Updating dashboard stats:', stats);
  
  // Update last updated timestamp
  updateElement('lastUpdated', new Date(stats.lastUpdated).toLocaleString());
  
  // Update token stats
  if (stats.tokens) {
    const tokenStats = stats.tokens;
    updateElement('totalTokensAnalyzed', tokenStats.totalTokensAnalyzed);
    updateElement('suspiciousTokensCount', tokenStats.suspiciousTokensCount);
    updateElement('suspiciousTokenPercentage', `${tokenStats.suspiciousTokenPercentage.toFixed(1)}%`);
    
    // Update risk level distribution
    updateRiskDistribution(tokenStats.riskLevelDistribution);
  }
  
  // Update transaction stats
  if (stats.transactions) {
    const transactionStats = stats.transactions;
    updateElement('totalTransactionsAnalyzed', transactionStats.totalTransactionsAnalyzed);
    updateElement('dustingTransactionsCount', transactionStats.dustingTransactionsCount);
    updateElement('dustingTransactionPercentage', `${transactionStats.dustingTransactionPercentage.toFixed(1)}%`);
    
    // Update attack vector chart
    updateAttackVectorChart(transactionStats.attackVectorDistribution);
  }
  
  // Update wallet stats
  if (stats.wallets) {
    const walletStats = stats.wallets;
    updateElement('totalWalletsAnalyzed', walletStats.totalWalletsAnalyzed);
    updateElement('victimWalletsCount', walletStats.victimWalletsCount);
    updateElement('attackerWalletsCount', walletStats.attackerWalletsCount);
    
    // Update wallet classification chart
    updateWalletClassificationChart(walletStats);
  }
  
  // Update address poisoning stats
  if (stats.addressPoisoning) {
    const poisoningStats = stats.addressPoisoning;
    updateElement('poisoningWalletsAnalyzed', poisoningStats.totalWalletsAnalyzed);
    updateElement('poisoningAttemptsCount', poisoningStats.totalPoisoningAttempts);
    updateElement('poisoningAverageRiskScore', poisoningStats.averageRiskScore.toFixed(2));
    
    // Update poisoning risk chart
    updatePoisoningRiskChart(poisoningStats.riskDistribution);
  }
  
  // Update wallet tokens stats
  if (stats.walletTokens) {
    const walletTokensStats = stats.walletTokens;
    updateElement('walletTokensWalletsAnalyzed', walletTokensStats.walletsAnalyzed);
    updateElement('walletTokensCount', walletTokensStats.tokensFound);
    updateElement('walletTokensSuspiciousCount', walletTokensStats.suspiciousTokens);
    
    // Update wallet tokens distribution chart
    updateWalletTokensDistributionChart(walletTokensStats.tokenDistribution);
  }
  
  // Update block analysis stats
  if (stats.blocks) {
    const blockStats = stats.blocks;
    updateElement('blocksAnalyzed', blockStats.blocksAnalyzed);
    updateElement('blockTransactionsCount', blockStats.transactionsFound);
    updateElement('blockDustingCount', blockStats.dustingTransactions);
    
    // Update block activity chart
    updateBlockActivityChart(blockStats.blockActivity);
  }
  
  // Update batch analysis stats
  if (stats.batch) {
    const batchStats = stats.batch;
    updateElement('batchWalletsAnalyzed', batchStats.walletsAnalyzed);
    updateElement('batchVictimCount', batchStats.victimWallets);
    updateElement('batchAttackerCount', batchStats.attackerWallets);
    
    // Update batch results chart
    updateBatchResultsChart(batchStats.results);
  }
  
  // Update memo analysis stats
  if (stats.memo) {
    const memoStats = stats.memo;
    updateElement('memosAnalyzed', memoStats.memosAnalyzed);
    updateElement('suspiciousMemosCount', memoStats.suspiciousMemos);
    updateElement('memoAverageRiskScore', memoStats.averageRiskScore.toFixed(2));
    
    // Update memo content type chart
    updateMemoContentTypeChart(memoStats.contentTypes);
  }
  
  // Update time range stats
  if (stats.timeRange) {
    const timeRangeStats = stats.timeRange;
    updateElement('timeRangeDisplay', `${new Date(timeRangeStats.startTime).toLocaleDateString()} - ${new Date(timeRangeStats.endTime).toLocaleDateString()}`);
    updateElement('timeRangeTransactionsCount', timeRangeStats.transactionsAnalyzed);
    updateElement('timeRangeDustingCount', timeRangeStats.dustingTransactions);
    
    // Update time range activity chart
    updateTimeRangeActivityChart(timeRangeStats.activity);
  }
  
  // Update overall stats
  if (stats.overall) {
    const overallStats = stats.overall;
    updateElement('totalAnalysesCount', overallStats.totalAnalyses);
    updateElement('totalDustingAttacksCount', overallStats.totalDustingAttacks);
    updateElement('totalPoisoningAttemptsCount', overallStats.totalPoisoningAttempts);
    
    // Update overall attack distribution chart
    updateOverallAttackDistributionChart(overallStats.attackDistribution);
  }
}

/**
 * Update an element's text content
 * @param {string} elementId - Element ID
 * @param {string|number} value - Value to set
 */
function updateElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

/**
 * Update risk distribution
 * @param {Object} riskDistribution - Risk distribution
 */
function updateRiskDistribution(riskDistribution) {
  const totalRisk = riskDistribution.high + riskDistribution.medium + riskDistribution.low + riskDistribution.none;
  
  if (totalRisk > 0) {
    const highPercent = (riskDistribution.high / totalRisk) * 100;
    const mediumPercent = (riskDistribution.medium / totalRisk) * 100;
    const lowPercent = (riskDistribution.low / totalRisk) * 100;
    
    updateElementStyle('highRiskProgress', 'width', `${highPercent}%`);
    updateElementStyle('mediumRiskProgress', 'width', `${mediumPercent}%`);
    updateElementStyle('lowRiskProgress', 'width', `${lowPercent}%`);
  }
  
  updateElement('highRiskCount', riskDistribution.high);
  updateElement('mediumRiskCount', riskDistribution.medium);
  updateElement('lowRiskCount', riskDistribution.low);
  updateElement('noRiskCount', riskDistribution.none);
}

/**
 * Update an element's style
 * @param {string} elementId - Element ID
 * @param {string} property - CSS property
 * @param {string} value - CSS value
 */
function updateElementStyle(elementId, property, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style[property] = value;
  }
}

/**
 * Show status message
 * @param {string} message - Status message
 * @param {boolean} loading - Whether to show loading spinner
 * @param {number} timeout - Timeout in milliseconds
 */
function showStatus(message, loading, timeout = 0) {
  const statusMessages = document.getElementById('statusMessages');
  const statusText = document.getElementById('statusText');
  const spinner = statusMessages.querySelector('.spinner-border');
  
  if (statusMessages && statusText) {
    statusText.textContent = message;
    statusMessages.classList.remove('d-none');
    
    if (spinner) {
      if (loading) {
        spinner.classList.remove('d-none');
      } else {
        spinner.classList.add('d-none');
      }
    }
    
    if (timeout > 0) {
      setTimeout(() => {
        statusMessages.classList.add('d-none');
      }, timeout);
    }
  }
}

/**
 * Hide status message
 */
function hideStatus() {
  const statusMessages = document.getElementById('statusMessages');
  if (statusMessages) {
    statusMessages.classList.add('d-none');
  }
}

// Data collection functions
function collectTokenData() {
  console.log('Collecting token data...');
  // Implementation will be added
  showStatus('Token analysis functionality will be implemented soon.', false, 3000);
}

function collectTransactionData() {
  console.log('Collecting transaction data...');
  // Implementation will be added
  showStatus('Transaction analysis functionality will be implemented soon.', false, 3000);
}

function collectWalletData() {
  console.log('Collecting wallet data...');
  // Implementation will be added
  showStatus('Wallet analysis functionality will be implemented soon.', false, 3000);
}

function collectAddressPoisoningData() {
  console.log('Collecting address poisoning data...');
  // Implementation will be added
  showStatus('Address poisoning analysis functionality will be implemented soon.', false, 3000);
}

function collectWalletTokensData() {
  console.log('Collecting wallet tokens data...');
  // Implementation will be added
  showStatus('Wallet tokens analysis functionality will be implemented soon.', false, 3000);
}

function collectBlockRangeData() {
  console.log('Collecting block range data...');
  // Implementation will be added
  showStatus('Block range analysis functionality will be implemented soon.', false, 3000);
}

function collectBatchData() {
  console.log('Collecting batch data...');
  // Implementation will be added
  showStatus('Batch analysis functionality will be implemented soon.', false, 3000);
}

function collectTimeRangeData() {
  console.log('Collecting time range data...');
  // Implementation will be added
  showStatus('Time range analysis functionality will be implemented soon.', false, 3000);
}

function collectMemoData() {
  console.log('Collecting memo data...');
  // Implementation will be added
  showStatus('Memo analysis functionality will be implemented soon.', false, 3000);
}

// Chart update functions
function updateAttackVectorChart(distribution) {
  const ctx = document.getElementById('attackVectorChart')?.getContext('2d');
  if (!ctx) return;
  
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
          distribution.SOL_DUST || 0,
          distribution.TOKEN_DUST || 0,
          distribution.MIXED_DUST || 0,
          distribution.OTHER || 0
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

function updateWalletClassificationChart(walletStats) {
  const ctx = document.getElementById('walletClassificationChart')?.getContext('2d');
  if (!ctx) return;
  
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
          walletStats.victimWalletsCount || 0,
          walletStats.attackerWalletsCount || 0,
          (walletStats.totalWalletsAnalyzed || 0) - (walletStats.victimWalletsCount || 0) - (walletStats.attackerWalletsCount || 0)
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

function updatePoisoningRiskChart(riskDistribution) {
  const ctx = document.getElementById('poisoningRiskChart')?.getContext('2d');
  if (!ctx) return;
  
  // Destroy existing chart if it exists
  if (poisoningRiskChart) {
    poisoningRiskChart.destroy();
  }
  
  // Create new chart
  poisoningRiskChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['High Risk', 'Medium Risk', 'Low Risk', 'No Risk'],
      datasets: [{
        data: [
          riskDistribution.high || 0,
          riskDistribution.medium || 0,
          riskDistribution.low || 0,
          riskDistribution.none || 0
        ],
        backgroundColor: [
          '#FF6B6B', // Red for high risk
          '#FFA500', // Orange for medium risk
          '#FFCE56', // Yellow for low risk
          '#4BC0C0'  // Teal for no risk
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

function updateWalletTokensDistributionChart(distribution) {
  const ctx = document.getElementById('walletTokensDistributionChart')?.getContext('2d');
  if (!ctx) return;
  
  // Destroy existing chart if it exists
  if (walletTokensDistributionChart) {
    walletTokensDistributionChart.destroy();
  }
  
  // Create new chart
  walletTokensDistributionChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Legitimate Tokens', 'Suspicious Tokens', 'Unknown Tokens'],
      datasets: [{
        data: [
          distribution.legitimate || 0,
          distribution.suspicious || 0,
          distribution.unknown || 0
        ],
        backgroundColor: [
          '#14F195', // Green for legitimate
          '#FF6B6B', // Red for suspicious
          '#AAAAAA'  // Gray for unknown
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

function updateBlockActivityChart(activity) {
  const ctx = document.getElementById('blockActivityChart')?.getContext('2d');
  if (!ctx) return;
  
  // Destroy existing chart if it exists
  if (blockActivityChart) {
    blockActivityChart.destroy();
  }
  
  // Create new chart
  blockActivityChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: activity.slots || [],
      datasets: [
        {
          label: 'Total Transactions',
          data: activity.transactions || [],
          backgroundColor: '#00C2FF',
          borderWidth: 1
        },
        {
          label: 'Dusting Transactions',
          data: activity.dustingTransactions || [],
          backgroundColor: '#FF6B6B',
          borderWidth: 1
        }
      ]
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

function updateBatchResultsChart(results) {
  const ctx = document.getElementById('batchResultsChart')?.getContext('2d');
  if (!ctx) return;
  
  // Destroy existing chart if it exists
  if (batchResultsChart) {
    batchResultsChart.destroy();
  }
  
  // Create new chart
  batchResultsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Victims', 'Attackers', 'Neutral'],
      datasets: [{
        data: [
          results.victims || 0,
          results.attackers || 0,
          results.neutral || 0
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

function updateMemoContentTypeChart(contentTypes) {
  const ctx = document.getElementById('memoContentTypeChart')?.getContext('2d');
  if (!ctx) return;
  
  // Destroy existing chart if it exists
  if (memoContentTypeChart) {
    memoContentTypeChart.destroy();
  }
  
  // Extract labels and data from contentTypes object
  const labels = Object.keys(contentTypes);
  const data = Object.values(contentTypes);
  
  // Create new chart
  memoContentTypeChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#FF6B6B', // Red
          '#FFA500', // Orange
          '#FFCE56', // Yellow
          '#14F195', // Green
          '#00C2FF', // Blue
          '#9945FF', // Purple
          '#AAAAAA'  // Gray
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

function updateTimeRangeActivityChart(activity) {
  const ctx = document.getElementById('timeRangeActivityChart')?.getContext('2d');
  if (!ctx) return;
  
  // Destroy existing chart if it exists
  if (timeRangeActivityChart) {
    timeRangeActivityChart.destroy();
  }
  
  // Format dates for display
  const formattedLabels = (activity.timestamps || []).map(timestamp => {
    return new Date(timestamp).toLocaleDateString();
  });
  
  // Create new chart
  timeRangeActivityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: formattedLabels,
      datasets: [
        {
          label: 'Transactions',
          data: activity.transactions || [],
          borderColor: '#00C2FF',
          backgroundColor: 'rgba(0, 194, 255, 0.1)',
          borderWidth: 2,
          fill: true
        },
        {
          label: 'Dusting Attacks',
          data: activity.dustingTransactions || [],
          borderColor: '#FF6B6B',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderWidth: 2,
          fill: true
        }
      ]
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

function updateOverallAttackDistributionChart(distribution) {
  const ctx = document.getElementById('overallAttackDistributionChart')?.getContext('2d');
  if (!ctx) return;
  
  // Destroy existing chart if it exists
  if (overallAttackDistributionChart) {
    overallAttackDistributionChart.destroy();
  }
  
  // Extract labels and data from distribution object
  const labels = Object.keys(distribution);
  const data = Object.values(distribution);
  
  // Create new chart
  overallAttackDistributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#FF6B6B', // Red
          '#FFA500', // Orange
          '#14F195', // Green
          '#00C2FF', // Blue
          '#9945FF', // Purple
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
