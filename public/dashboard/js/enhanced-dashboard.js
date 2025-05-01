/**
 * Enhanced Solana Spam Detector Dashboard
 * This file contains the functionality for the enhanced dashboard with all CLI features
 */

// API base URL
const API_BASE_URL = '/v1/api';

// Global chart variables
let attackVectorChart = null;
let walletClassificationChart = null;
let poisoningRiskChart = null;
let tokenDistributionChart = null;
let blockActivityChart = null;
let timeRangeActivityChart = null;
let memoAnalysisChart = null;
let batchAnalysisChart = null;

// Debug helper function
function debugLog(message, isError = false) {
  if (isError) {
    console.error('DEBUG:', message);
  } else {
    console.log('DEBUG:', message);
  }
}

// Show status message
function showStatus(message, isLoading = false, autoHideMs = 0) {
  debugLog(`Status: ${message} (loading: ${isLoading})`);

  const statusContainer = document.getElementById('statusMessages');
  const statusText = document.getElementById('statusText');

  if (!statusContainer || !statusText) {
    console.warn('Status elements not found');
    return;
  }

  // Update status
  statusText.textContent = message;
  statusContainer.classList.remove('d-none', 'alert-info', 'alert-success', 'alert-danger');

  if (isLoading) {
    statusContainer.classList.add('alert-info');
  } else {
    statusContainer.classList.add(message.toLowerCase().includes('error') ? 'alert-danger' : 'alert-success');
  }

  // Show spinner if loading
  const spinner = statusContainer.querySelector('.spinner-border');
  if (spinner) {
    spinner.style.display = isLoading ? 'inline-block' : 'none';
  }

  // Auto-hide after delay if specified
  if (autoHideMs > 0 && !isLoading) {
    setTimeout(() => {
      statusContainer.classList.add('d-none');
    }, autoHideMs);
  }
}

// Display error in results container
function displayErrorInResults(containerId, errorMessage) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Results container not found: ${containerId}`);
    return;
  }

  container.innerHTML = `
    <div class="alert alert-danger">
      <strong>Error:</strong> ${errorMessage}
    </div>
    <div class="mt-3">
      <p>Suggestions:</p>
      <ul>
        <li>Check your internet connection</li>
        <li>Verify the input parameters are correct</li>
        <li>Try again in a few moments</li>
      </ul>
    </div>
  `;
}

// Helper function to format dates
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';

  try {
    // Handle both timestamp numbers and ISO strings
    const date = typeof timestamp === 'number'
      ? new Date(timestamp * 1000) // Unix timestamp (seconds)
      : new Date(timestamp);

    return date.toLocaleString();
  } catch (e) {
    return 'Invalid date';
  }
}

// Helper function to shorten addresses for display
function shortenAddress(address, prefixLength = 6, suffixLength = 4) {
  if (!address || typeof address !== 'string') return 'N/A';
  if (address.length <= prefixLength + suffixLength + 3) return address;

  return `${address.substring(0, prefixLength)}...${address.substring(address.length - suffixLength)}`;
}

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', function() {
  // First, check if we can log to the debug area
  const debugOutput = document.getElementById('debugOutput');

  // Function to log to console and debug area if available
  function safeLog(message, isError = false) {
    if (isError) {
      console.error('DEBUG:', message);
    } else {
      console.log('DEBUG:', message);
    }

    // Try to log to debug area if it exists
    if (debugOutput) {
      const msgElement = document.createElement('div');
      msgElement.className = isError ? 'text-danger' : 'text-info';
      msgElement.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
      debugOutput.appendChild(msgElement);
    }
  }

  safeLog('Enhanced Dashboard initialized');

  try {
    // Initialize Bootstrap tabs safely
    try {
      initializeTabs();
    } catch (error) {
      safeLog(`Error initializing tabs: ${error.message}`, true);
    }

    // Set up form submission handlers safely
    try {
      setupFormHandlers();
    } catch (error) {
      safeLog(`Error setting up form handlers: ${error.message}`, true);
    }

    // Initialize charts safely
    try {
      initializeCharts();
    } catch (error) {
      safeLog(`Error initializing charts: ${error.message}`, true);
    }

    // Load initial dashboard data safely
    try {
      loadDashboardStats();
    } catch (error) {
      safeLog(`Error loading dashboard stats: ${error.message}`, true);
    }

    // Set up refresh button safely
    try {
      const refreshBtn = document.getElementById('refreshDashboard');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
          loadDashboardStats();
        });
      } else {
        safeLog('Refresh button not found', true);
      }
    } catch (error) {
      safeLog(`Error setting up refresh button: ${error.message}`, true);
    }

    // Set up clear debug button safely
    try {
      const clearDebugBtn = document.getElementById('clearDebug');
      if (clearDebugBtn) {
        clearDebugBtn.addEventListener('click', function() {
          if (debugOutput) {
            debugOutput.innerHTML = '';
            safeLog('Debug output cleared');
          }
        });
      }
    } catch (error) {
      safeLog(`Error setting up clear debug button: ${error.message}`, true);
    }

    // Set up toggle debug panel button
    try {
      const toggleDebugBtn = document.getElementById('toggleDebug');
      const debugPanel = document.getElementById('debugPanel');

      if (toggleDebugBtn && debugPanel) {
        toggleDebugBtn.addEventListener('click', function(e) {
          e.preventDefault();
          debugPanel.classList.toggle('d-none');
          safeLog('Debug panel toggled');
        });
      }
    } catch (error) {
      safeLog(`Error setting up toggle debug button: ${error.message}`, true);
    }

    // Add test data buttons for development
    try {
      if (debugOutput) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'mt-2';

        const testDataBtn = document.createElement('button');
        testDataBtn.className = 'btn btn-sm btn-primary';
        testDataBtn.textContent = 'Test Token Analysis';
        testDataBtn.onclick = function() {
          safeLog('Running test token analysis');
          analyzeToken('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 10);
        };
        buttonContainer.appendChild(testDataBtn);

        const testTxBtn = document.createElement('button');
        testTxBtn.className = 'btn btn-sm btn-info ms-2';
        testTxBtn.textContent = 'Test Transaction Analysis';
        testTxBtn.onclick = function() {
          safeLog('Running test transaction analysis');
          analyzeTransaction('4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf');
        };
        buttonContainer.appendChild(testTxBtn);

        debugOutput.parentNode.appendChild(buttonContainer);
      }
    } catch (error) {
      safeLog(`Error adding test buttons: ${error.message}`, true);
    }

    // Add direct form submission handlers
    try {
      // Token form direct handler
      const tokenForm = document.getElementById('tokenForm');
      const tokenMintInput = document.getElementById('tokenMint');
      const tokenMaxInput = document.getElementById('tokenMaxTransactions');

      if (tokenForm && tokenMintInput) {
        safeLog('Adding direct token form handler');
        tokenForm.onsubmit = function(e) {
          e.preventDefault();
          const tokenMint = tokenMintInput.value;
          const maxTransactions = tokenMaxInput ? tokenMaxInput.value : 50;

          safeLog(`Direct token form submission: ${tokenMint}`);
          analyzeToken(tokenMint, maxTransactions);
        };
      }
    } catch (error) {
      safeLog(`Error adding direct form handlers: ${error.message}`, true);
    }

  } catch (error) {
    safeLog(`Error initializing dashboard: ${error.message}`, true);
    console.error('Error initializing dashboard:', error);
  }
});

/**
 * Initialize Bootstrap tabs
 */
function initializeTabs() {
  // Get all tab elements
  const tabElements = document.querySelectorAll('[data-bs-toggle="tab"]');

  // Check if Bootstrap is available
  if (typeof bootstrap !== 'undefined') {
    // Initialize each tab using Bootstrap's Tab API
    tabElements.forEach(tabElement => {
      try {
        const tab = new bootstrap.Tab(tabElement);

        // Add click event listener
        tabElement.addEventListener('click', function(event) {
          event.preventDefault();
          tab.show();
        });
      } catch (error) {
        console.error('Error initializing tab:', error);
      }
    });

    console.log('Bootstrap tabs initialized:', tabElements.length);
  } else {
    console.log('Bootstrap not available, using fallback tabs');
    // Fallback is handled by fallback-tabs.js
  }
}

/**
 * Set up form submission handlers
 */
function setupFormHandlers() {
  try {
    // Helper function to safely set up form handlers
    function setupFormHandler(formId, inputId, validationMessage, additionalInputs, handlerFunction) {
      const form = document.getElementById(formId);
      if (!form) {
        console.warn(`Form not found: ${formId}`);
        return;
      }

      form.onsubmit = function(e) {
        e.preventDefault();

        const mainInput = document.getElementById(inputId);
        if (!mainInput) {
          console.warn(`Input not found: ${inputId}`);
          showStatus(`Error: Could not find input field`, false);
          return;
        }

        const mainValue = mainInput.value;
        if (!mainValue) {
          showStatus(validationMessage, false);
          return;
        }

        // Get additional input values
        const additionalValues = {};
        for (const [key, id] of Object.entries(additionalInputs || {})) {
          const input = document.getElementById(id);
          additionalValues[key] = input ? input.value : null;
        }

        // Call the handler function with the main value and additional values
        handlerFunction(mainValue, additionalValues);
      };
    }

    // Token Analysis Form
    setupFormHandler(
      'tokenForm',
      'tokenMint',
      'Token mint address is required',
      { maxTransactions: 'tokenMaxTransactions' },
      (tokenMint, additionalValues) => {
        analyzeToken(tokenMint, additionalValues.maxTransactions);
      }
    );

    // Transaction Analysis Form
    setupFormHandler(
      'transactionForm',
      'transactionSignature',
      'Transaction signature is required',
      {},
      (signature) => {
        analyzeTransaction(signature);
      }
    );

    // Wallet Analysis Form
    setupFormHandler(
      'walletForm',
      'walletAddress',
      'Wallet address is required',
      { numTransactions: 'walletNumTransactions' },
      (walletAddress, additionalValues) => {
        analyzeWallet(walletAddress, additionalValues.numTransactions);
      }
    );

    // Address Poisoning Analysis Form
    setupFormHandler(
      'addressPoisoningForm',
      'poisoningWalletAddress',
      'Wallet address is required',
      { numTransactions: 'poisoningNumTransactions' },
      (walletAddress, additionalValues) => {
        analyzeAddressPoisoning(walletAddress, additionalValues.numTransactions);
      }
    );

    // Wallet Tokens Analysis Form
    setupFormHandler(
      'walletTokensForm',
      'walletTokensAddress',
      'Wallet address is required',
      { numTransactions: 'walletTokensNumTransactions' },
      (walletAddress, additionalValues) => {
        analyzeWalletTokens(walletAddress, additionalValues.numTransactions);
      }
    );

    // Block Range Analysis Form
    setupFormHandler(
      'blockRangeForm',
      'blockStartSlot',
      'Start slot number is required',
      {
        endSlot: 'blockEndSlot',
        maxTransactions: 'blockMaxTransactions'
      },
      (startSlot, additionalValues) => {
        if (!additionalValues.endSlot) {
          showStatus('End slot number is required', false);
          return;
        }
        analyzeBlockRange(startSlot, additionalValues.endSlot, additionalValues.maxTransactions);
      }
    );

    // Batch Analysis Form
    setupFormHandler(
      'batchForm',
      'batchWalletAddresses',
      'Wallet addresses are required',
      { numTransactions: 'batchNumTransactions' },
      (walletAddresses, additionalValues) => {
        analyzeBatchWallets(walletAddresses, additionalValues.numTransactions);
      }
    );

    // Time Range Analysis Form
    setupFormHandler(
      'timeRangeForm',
      'timeRangeWalletAddress',
      'Wallet address is required',
      {
        startTime: 'timeRangeStartTime',
        endTime: 'timeRangeEndTime',
        maxTransactions: 'timeRangeMaxTransactions'
      },
      (walletAddress, additionalValues) => {
        if (!additionalValues.startTime || !additionalValues.endTime) {
          showStatus('Start time and end time are required', false);
          return;
        }
        analyzeTimeRange(walletAddress, additionalValues.startTime, additionalValues.endTime, additionalValues.maxTransactions);
      }
    );

    // Memo Analysis Form
    setupFormHandler(
      'memoForm',
      'memoText',
      'Memo text is required',
      {},
      (memoText) => {
        analyzeMemo(memoText);
      }
    );

    console.log('Form handlers set up successfully');
  } catch (error) {
    console.error('Error setting up form handlers:', error);
    showStatus('Error setting up form handlers. See console for details.', false);
  }
}

/**
 * Initialize charts
 */
function initializeCharts() {
  try {
    // Helper function to safely initialize a chart
    function initializeChart(chartId, chartType, chartData, chartOptions) {
      const chartCanvas = document.getElementById(chartId);
      if (!chartCanvas) {
        console.warn(`Chart canvas not found: ${chartId}`);
        return null;
      }

      try {
        const ctx = chartCanvas.getContext('2d');
        if (!ctx) {
          console.warn(`Could not get 2D context for chart: ${chartId}`);
          return null;
        }

        // Check if Chart is defined
        if (typeof Chart !== 'undefined') {
          return new Chart(ctx, {
            type: chartType,
            data: chartData,
            options: chartOptions || {
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
        } else {
          console.warn(`Chart.js not available for chart: ${chartId}`);
          return null;
        }
      } catch (error) {
        console.error(`Error initializing chart ${chartId}:`, error);
        return null;
      }
    }

    // Attack vector chart
    attackVectorChart = initializeChart(
      'attackVectorChart',
      'doughnut',
      {
        labels: ['SOL Dust', 'Token Dust', 'Mixed Dust', 'Other'],
        datasets: [{
          data: [25, 40, 20, 15],
          backgroundColor: [
            '#14F195', // Green
            '#9945FF', // Purple
            '#00C2FF', // Blue
            '#F1A208'  // Orange
          ],
          borderWidth: 1
        }]
      }
    );

    // Wallet classification chart
    walletClassificationChart = initializeChart(
      'walletClassificationChart',
      'pie',
      {
        labels: ['Victims', 'Attackers', 'Neutral'],
        datasets: [{
          data: [60, 30, 10],
          backgroundColor: [
            '#FF6B6B', // Red for victims
            '#4D4DFF', // Blue for attackers
            '#AAAAAA'  // Gray for neutral
          ],
          borderWidth: 1
        }]
      }
    );

    // Poisoning risk chart
    poisoningRiskChart = initializeChart(
      'poisoningRiskChart',
      'pie',
      {
        labels: ['High Risk', 'Medium Risk', 'Low Risk', 'No Risk'],
        datasets: [{
          data: [15, 25, 35, 25],
          backgroundColor: [
            '#FF6B6B', // Red for high risk
            '#FFA500', // Orange for medium risk
            '#FFCE56', // Yellow for low risk
            '#4BC0C0'  // Teal for no risk
          ],
          borderWidth: 1
        }]
      }
    );

    console.log('Charts initialized successfully');
  } catch (error) {
    console.error('Error initializing charts:', error);
  }
}

/**
 * Load dashboard statistics
 */
function loadDashboardStats() {
  try {
    showStatus('Loading dashboard data...', true);

    // Helper function to safely update element text
    function safelyUpdateText(elementId, value) {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = value;
      } else {
        console.warn(`Element not found for updating text: ${elementId}`);
      }
    }

    // Helper function to safely update element style
    function safelyUpdateStyle(elementId, property, value) {
      const element = document.getElementById(elementId);
      if (element) {
        element.style[property] = value;
      } else {
        console.warn(`Element not found for updating style: ${elementId}`);
      }
    }

    // Simulate API call for now
    setTimeout(function() {
      try {
        // Update dashboard stats with mock data
        safelyUpdateText('totalTokensAnalyzed', '1,245');
        safelyUpdateText('suspiciousTokensCount', '328');
        safelyUpdateText('suspiciousTokenPercentage', '26.3%');

        safelyUpdateText('totalTransactionsAnalyzed', '8,742');
        safelyUpdateText('dustingTransactionsCount', '1,892');
        safelyUpdateText('dustingTransactionPercentage', '21.6%');

        safelyUpdateText('totalWalletsAnalyzed', '3,156');
        safelyUpdateText('victimWalletsCount', '1,893');
        safelyUpdateText('attackerWalletsCount', '947');

        safelyUpdateText('poisoningWalletsAnalyzed', '2,478');
        safelyUpdateText('poisoningAttemptsCount', '583');
        safelyUpdateText('poisoningAverageRiskScore', '6.8');

        const currentTime = new Date().toLocaleString();
        safelyUpdateText('lastUpdated', currentTime);
        safelyUpdateText('navLastUpdated', currentTime);

        // Update risk level progress bars
        safelyUpdateStyle('highRiskProgress', 'width', '15%');
        safelyUpdateStyle('mediumRiskProgress', 'width', '25%');
        safelyUpdateStyle('lowRiskProgress', 'width', '35%');

        showStatus('Dashboard data loaded successfully!', false, 3000);
      } catch (error) {
        console.error('Error updating dashboard stats:', error);
        showStatus('Error updating dashboard stats. See console for details.', false);
      }
    }, 1500);

    // Uncomment to use real API
    /*
    fetch(`${API_BASE_URL}/dashboard/stats`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Update dashboard stats
          updateDashboardStats(data.data);
          showStatus('Dashboard data loaded successfully!', false, 3000);
        } else {
          showStatus(`Error: ${data.error}`, false);
        }
      })
      .catch(error => {
        console.error('Error loading dashboard data:', error);
        showStatus('Error loading dashboard data. Please try again.', false);
      });
    */
  } catch (error) {
    console.error('Error in loadDashboardStats:', error);
    showStatus('Error loading dashboard data. See console for details.', false);
  }
}

/**
 * Update dashboard statistics
 * @param {Object} stats - Dashboard statistics
 */
function updateDashboardStats(stats) {
  try {
    // Helper function to safely update element text
    function safelyUpdateText(elementId, value) {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = value;
      } else {
        console.warn(`Element not found for updating text: ${elementId}`);
      }
    }

    // Helper function to safely update element style
    function safelyUpdateStyle(elementId, property, value) {
      const element = document.getElementById(elementId);
      if (element) {
        element.style[property] = value;
      } else {
        console.warn(`Element not found for updating style: ${elementId}`);
      }
    }

    // Update token stats
    if (stats.tokens) {
      safelyUpdateText('totalTokensAnalyzed', stats.tokens.totalTokensAnalyzed.toLocaleString());
      safelyUpdateText('suspiciousTokensCount', stats.tokens.suspiciousTokensCount.toLocaleString());
      safelyUpdateText('suspiciousTokenPercentage', `${stats.tokens.suspiciousTokenPercentage.toFixed(1)}%`);

      // Update risk level progress bars
      if (stats.tokens.riskDistribution) {
        safelyUpdateStyle('highRiskProgress', 'width', `${stats.tokens.riskDistribution.high}%`);
        safelyUpdateStyle('mediumRiskProgress', 'width', `${stats.tokens.riskDistribution.medium}%`);
        safelyUpdateStyle('lowRiskProgress', 'width', `${stats.tokens.riskDistribution.low}%`);
      }
    }

    // Update transaction stats
    if (stats.transactions) {
      safelyUpdateText('totalTransactionsAnalyzed', stats.transactions.totalTransactions.toLocaleString());
      safelyUpdateText('dustingTransactionsCount', stats.transactions.dustingTransactions.toLocaleString());
      safelyUpdateText('dustingTransactionPercentage', `${stats.transactions.dustingPercentage.toFixed(1)}%`);

      // Update attack vector chart
      if (stats.transactions.attackVectors) {
        try {
          updateAttackVectorChart(stats.transactions.attackVectors);
        } catch (error) {
          console.error('Error updating attack vector chart:', error);
        }
      }
    }

    // Update wallet stats
    if (stats.wallets) {
      safelyUpdateText('totalWalletsAnalyzed', stats.wallets.totalWallets.toLocaleString());
      safelyUpdateText('victimWalletsCount', stats.wallets.victimWallets.toLocaleString());
      safelyUpdateText('attackerWalletsCount', stats.wallets.attackerWallets.toLocaleString());

      // Update wallet classification chart
      try {
        updateWalletClassificationChart(stats.wallets);
      } catch (error) {
        console.error('Error updating wallet classification chart:', error);
      }
    }

    // Update address poisoning stats
    if (stats.addressPoisoning) {
      safelyUpdateText('poisoningWalletsAnalyzed', stats.addressPoisoning.walletsAnalyzed.toLocaleString());
      safelyUpdateText('poisoningAttemptsCount', stats.addressPoisoning.poisoningAttempts.toLocaleString());
      safelyUpdateText('poisoningAverageRiskScore', stats.addressPoisoning.averageRiskScore.toFixed(1));

      // Update poisoning risk chart
      if (stats.addressPoisoning.riskDistribution) {
        try {
          updatePoisoningRiskChart(stats.addressPoisoning.riskDistribution);
        } catch (error) {
          console.error('Error updating poisoning risk chart:', error);
        }
      }
    }

    // Update last updated timestamps
    const currentTime = new Date(stats.lastUpdated || new Date()).toLocaleString();
    safelyUpdateText('lastUpdated', currentTime);
    safelyUpdateText('navLastUpdated', currentTime);
  } catch (error) {
    console.error('Error updating dashboard stats:', error);
    showStatus('Error updating dashboard stats. See console for details.', false);
  }
}

/**
 * Update attack vector chart
 * @param {Object} attackVectors - Attack vector distribution
 */
function updateAttackVectorChart(attackVectors) {
  try {
    if (!attackVectorChart) {
      console.warn('Attack vector chart not initialized');
      return;
    }

    attackVectorChart.data.datasets[0].data = [
      attackVectors.solDust || 0,
      attackVectors.tokenDust || 0,
      attackVectors.mixedDust || 0,
      attackVectors.other || 0
    ];

    attackVectorChart.update();
    console.log('Attack vector chart updated successfully');
  } catch (error) {
    console.error('Error updating attack vector chart:', error);
  }
}

/**
 * Update wallet classification chart
 * @param {Object} walletStats - Wallet statistics
 */
function updateWalletClassificationChart(walletStats) {
  try {
    if (!walletClassificationChart) {
      console.warn('Wallet classification chart not initialized');
      return;
    }

    walletClassificationChart.data.datasets[0].data = [
      walletStats.victimWallets || 0,
      walletStats.attackerWallets || 0,
      walletStats.neutralWallets || 0
    ];

    walletClassificationChart.update();
    console.log('Wallet classification chart updated successfully');
  } catch (error) {
    console.error('Error updating wallet classification chart:', error);
  }
}

/**
 * Update poisoning risk chart
 * @param {Object} riskDistribution - Risk distribution
 */
function updatePoisoningRiskChart(riskDistribution) {
  try {
    if (!poisoningRiskChart) {
      console.warn('Poisoning risk chart not initialized');
      return;
    }

    poisoningRiskChart.data.datasets[0].data = [
      riskDistribution.high || 0,
      riskDistribution.medium || 0,
      riskDistribution.low || 0,
      riskDistribution.none || 0
    ];

    poisoningRiskChart.update();
    console.log('Poisoning risk chart updated successfully');
  } catch (error) {
    console.error('Error updating poisoning risk chart:', error);
  }
}

/**
 * Analyze token
 * @param {string} tokenMint - Token mint address
 * @param {number} maxTransactions - Maximum transactions to analyze
 */
function analyzeToken(tokenMint, maxTransactions) {
  try {
    debugLog(`Analyzing token ${tokenMint}...`);
    showStatus(`Analyzing token ${tokenMint}...`, true);

    // Show the results container
    const resultsContainer = document.getElementById('tokenResults');
    if (!resultsContainer) {
      debugLog('Token results container not found', true);
      return;
    }

    resultsContainer.classList.remove('d-none');

    // Get the results content container
    const resultsContentContainer = document.getElementById('tokenResultsContent');
    if (!resultsContentContainer) {
      debugLog('Token results content container not found', true);
      return;
    }

    // Show loading indicator in the results container
    resultsContentContainer.innerHTML = `
      <div class="d-flex justify-content-center my-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;

    // Use mock data for testing
    debugLog('Creating mock data for token analysis');

    setTimeout(function() {
      try {
        debugLog('Mock data ready, displaying results');

        const mockData = {
          tokenMint,
          maxTransactions: parseInt(maxTransactions, 10),
          result: {
            isSuspicious: true,
            suspiciousReasons: ["Low transaction volume", "Recently created token"],
            tokenInfo: {
              name: "Test Token",
              symbol: "TEST",
              decimals: 9,
              totalSupply: "1000000000"
            },
            transactions: [
              {
                signature: "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf",
                timestamp: new Date().toISOString(),
                type: "TRANSFER",
                amount: "0.000001",
                sender: "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
                receiver: "HMBKn2hPdLLEadXxKxM2bfeqHeXxqtVMpB8e9yJDTc5z"
              }
            ]
          },
          logs: ["Analyzing token...", "Found 1 transaction", "Analysis complete"]
        };

        showStatus('Token analysis complete!', false, 3000);
        displayTokenResults(mockData);
      } catch (error) {
        debugLog(`Error displaying token results: ${error.message}`, true);
        showStatus(`Error: ${error.message}`, false);
        displayErrorInResults('tokenResultsContent', `Error displaying results: ${error.message}`);
      }
    }, 1500);

    // Uncomment to use real API
    /*
    fetch(`${API_BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tokenMint,
        maxTransactions: parseInt(maxTransactions, 10)
      })
    })
    .then(response => {
      debugLog(`Token analysis response status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      debugLog('Token analysis response received');
      if (data.success) {
        showStatus('Token analysis complete!', false, 3000);
        displayTokenResults(data.data);
      } else {
        debugLog(`API error: ${data.error || 'Unknown error'}`, true);
        showStatus(`Error: ${data.error || 'Unknown error'}`, false);
        displayErrorInResults('tokenResultsContent', data.error || 'Unknown error occurred during analysis');
      }
    })
    .catch(error => {
      debugLog(`Error analyzing token: ${error.message}`, true);
      showStatus('Error analyzing token. Please try again.', false);
      displayErrorInResults('tokenResultsContent', 'Failed to connect to the server. Please try again.');
    });
    */
  } catch (error) {
    debugLog(`Unexpected error in analyzeToken: ${error.message}`, true);
    showStatus(`Error: ${error.message}`, false);
  }
}

/**
 * Analyze transaction
 * @param {string} signature - Transaction signature
 */
function analyzeTransaction(signature) {
  showStatus(`Analyzing transaction ${signature}...`, true);

  console.log('Sending transaction analysis request:', { signature });

  // Show the results container
  const resultsContainer = document.getElementById('transactionResults');
  resultsContainer.classList.remove('d-none');

  // First try the mock data for testing
  setTimeout(function() {
    const mockData = {
      success: true,
      data: {
        signature,
        result: {
          isDustingAttack: false,
          transactionInfo: {
            blockTime: new Date().toISOString(),
            slot: 123456789,
            fee: 5000,
            status: "confirmed"
          },
          transfers: [
            {
              type: "SOL",
              amount: "0.1",
              sender: "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
              receiver: "HMBKn2hPdLLEadXxKxM2bfeqHeXxqtVMpB8e9yJDTc5z",
              isDusting: false
            }
          ],
          memo: null
        },
        logs: ["Analyzing transaction...", "Transaction confirmed", "Analysis complete"]
      }
    };

    showStatus('Transaction analysis complete!', false, 3000);
    displayTransactionResults(mockData.data);
  }, 1500);

  // Uncomment to use real API
  /*
  fetch(`${API_BASE_URL}/transaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      signature
    })
  })
  .then(response => {
    console.log('Transaction analysis response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Transaction analysis response data:', data);
    if (data.success) {
      showStatus('Transaction analysis complete!', false, 3000);
      displayTransactionResults(data.data);
    } else {
      showStatus(`Error: ${data.error || 'Unknown error'}`, false);
      displayErrorInResults('transactionResultsContent', data.error || 'Unknown error occurred during analysis');
    }
  })
  .catch(error => {
    console.error('Error analyzing transaction:', error);
    showStatus('Error analyzing transaction. Please try again.', false);
    displayErrorInResults('transactionResultsContent', 'Failed to connect to the server. Please try again.');
  });
  */
}

/**
 * Analyze wallet
 * @param {string} walletAddress - Wallet address
 * @param {number} numTransactions - Number of transactions to analyze
 */
function analyzeWallet(walletAddress, numTransactions) {
  showStatus(`Analyzing wallet ${walletAddress}...`, true);

  console.log('Sending wallet analysis request:', {
    walletAddress,
    numTransactions: parseInt(numTransactions, 10)
  });

  // Make sure we're on the wallet tab
  try {
    // Try to activate the wallet tab
    const walletTab = document.getElementById('wallet-tab');
    if (walletTab) {
      walletTab.click();
    }
  } catch (error) {
    console.error('Error activating wallet tab:', error);
  }

  // Show the results container
  const resultsContainer = document.getElementById('walletResults');
  if (resultsContainer) {
    resultsContainer.classList.remove('d-none');
  } else {
    console.warn('Wallet results container not found');

    // Try to find the parent container and create the results container if needed
    const tabPane = document.getElementById('wallet-tab-pane');
    if (tabPane) {
      // Create the results container if it doesn't exist
      const newResultsContainer = document.createElement('div');
      newResultsContainer.id = 'walletResults';
      newResultsContainer.className = 'mt-4';

      const heading = document.createElement('h5');
      heading.textContent = 'Analysis Results';

      const card = document.createElement('div');
      card.className = 'card';

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';
      cardBody.id = 'walletResultsContent';

      card.appendChild(cardBody);
      newResultsContainer.appendChild(heading);
      newResultsContainer.appendChild(card);

      // Append after the form
      const walletForm = document.getElementById('walletForm');
      if (walletForm) {
        walletForm.after(newResultsContainer);
        console.log('Created wallet results container');
      } else {
        tabPane.appendChild(newResultsContainer);
        console.log('Created wallet results container (appended to tab pane)');
      }
    }
  }

  // First try the mock data for testing
  setTimeout(function() {
    const mockData = {
      success: true,
      data: {
        walletAddress,
        numTransactions: parseInt(numTransactions, 10),
        result: {
          classification: "VICTIM",
          dustingAttacks: 2,
          totalTransactions: parseInt(numTransactions, 10),
          dustingPercentage: 20,
          transactions: [
            {
              signature: "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf",
              timestamp: new Date().toISOString(),
              isDustingAttack: true,
              type: "TOKEN_TRANSFER",
              amount: "0.000001",
              tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
              sender: "HMBKn2hPdLLEadXxKxM2bfeqHeXxqtVMpB8e9yJDTc5z",
              receiver: walletAddress
            },
            {
              signature: "5kzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDg",
              timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
              isDustingAttack: true,
              type: "SOL_TRANSFER",
              amount: "0.000001",
              sender: "HMBKn2hPdLLEadXxKxM2bfeqHeXxqtVMpB8e9yJDTc5z",
              receiver: walletAddress
            },
            {
              signature: "6jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDh",
              timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
              isDustingAttack: false,
              type: "SOL_TRANSFER",
              amount: "1.5",
              sender: walletAddress,
              receiver: "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg"
            }
          ]
        },
        logs: ["Analyzing wallet...", "Found 3 transactions", "Detected 2 dusting attacks", "Analysis complete"]
      }
    };

    showStatus('Wallet analysis complete!', false, 3000);
    displayWalletResults(mockData.data);
  }, 1500);

  // Uncomment to use real API
  /*
  fetch(`${API_BASE_URL}/wallet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      walletAddress,
      numTransactions: parseInt(numTransactions, 10)
    })
  })
  .then(response => {
    console.log('Wallet analysis response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Wallet analysis response data:', data);
    if (data.success) {
      showStatus('Wallet analysis complete!', false, 3000);
      displayWalletResults(data.data);
    } else {
      showStatus(`Error: ${data.error || 'Unknown error'}`, false);
      displayErrorInResults('walletResultsContent', data.error || 'Unknown error occurred during analysis');
    }
  })
  .catch(error => {
    console.error('Error analyzing wallet:', error);
    showStatus('Error analyzing wallet. Please try again.', false);
    displayErrorInResults('walletResultsContent', 'Failed to connect to the server. Please try again.');
  });
  */
}

/**
 * Analyze address poisoning
 * @param {string} walletAddress - Wallet address
 * @param {number} numTransactions - Number of transactions to analyze
 */
function analyzeAddressPoisoning(walletAddress, numTransactions) {
  showStatus(`Analyzing address poisoning for ${walletAddress}...`, true);

  console.log('Sending address poisoning analysis request:', {
    walletAddress,
    numTransactions: parseInt(numTransactions, 10)
  });

  // Make sure we're on the address poisoning tab
  try {
    // Try to activate the address poisoning tab
    const poisoningTab = document.getElementById('address-poisoning-tab');
    if (poisoningTab) {
      poisoningTab.click();
    }
  } catch (error) {
    console.error('Error activating address poisoning tab:', error);
  }

  // Show the results container
  const resultsContainer = document.getElementById('addressPoisoningResults');
  if (resultsContainer) {
    resultsContainer.classList.remove('d-none');
  } else {
    console.warn('Address poisoning results container not found');

    // Try to find the parent container and create the results container if needed
    const tabPane = document.getElementById('address-poisoning-tab-pane');
    if (tabPane) {
      // Create the results container if it doesn't exist
      const newResultsContainer = document.createElement('div');
      newResultsContainer.id = 'addressPoisoningResults';
      newResultsContainer.className = 'mt-4';

      const heading = document.createElement('h5');
      heading.textContent = 'Analysis Results';

      const card = document.createElement('div');
      card.className = 'card';

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';
      cardBody.id = 'addressPoisoningResultsContent';

      card.appendChild(cardBody);
      newResultsContainer.appendChild(heading);
      newResultsContainer.appendChild(card);

      // Append after the form
      const poisoningForm = document.getElementById('addressPoisoningForm');
      if (poisoningForm) {
        poisoningForm.after(newResultsContainer);
        console.log('Created address poisoning results container');
      } else {
        tabPane.appendChild(newResultsContainer);
        console.log('Created address poisoning results container (appended to tab pane)');
      }
    }
  }

  // First try the mock data for testing
  setTimeout(function() {
    const mockData = {
      success: true,
      data: {
        walletAddress,
        numTransactions: parseInt(numTransactions, 10),
        result: {
          isPoisoningTarget: true,
          poisoningAttempts: 3,
          totalTransactions: parseInt(numTransactions, 10),
          poisoningPercentage: 6,
          riskScore: 7.5,
          riskLevel: "MEDIUM",
          similarAddresses: [
            {
              address: walletAddress.substring(0, 10) + "XYZ" + walletAddress.substring(13),
              similarity: 0.92,
              transactions: 5,
              isAttacker: true
            },
            {
              address: walletAddress.substring(0, 5) + "ABC" + walletAddress.substring(8),
              similarity: 0.85,
              transactions: 2,
              isAttacker: true
            }
          ],
          suspiciousTransactions: [
            {
              signature: "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf",
              timestamp: new Date().toISOString(),
              sender: walletAddress.substring(0, 10) + "XYZ" + walletAddress.substring(13),
              receiver: "HMBKn2hPdLLEadXxKxM2bfeqHeXxqtVMpB8e9yJDTc5z",
              amount: "0.1",
              type: "SOL_TRANSFER"
            }
          ]
        },
        logs: ["Analyzing address poisoning...", "Found 3 poisoning attempts", "Analysis complete"]
      }
    };

    showStatus('Address poisoning analysis complete!', false, 3000);
    displayAddressPoisoningResults(mockData.data);
  }, 1500);

  // Uncomment to use real API
  /*
  fetch(`${API_BASE_URL}/address-poisoning`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      walletAddress,
      numTransactions: parseInt(numTransactions, 10)
    })
  })
  .then(response => {
    console.log('Address poisoning analysis response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Address poisoning analysis response data:', data);
    if (data.success) {
      showStatus('Address poisoning analysis complete!', false, 3000);
      displayAddressPoisoningResults(data.data);
    } else {
      showStatus(`Error: ${data.error || 'Unknown error'}`, false);
      displayErrorInResults('addressPoisoningResultsContent', data.error || 'Unknown error occurred during analysis');
    }
  })
  .catch(error => {
    console.error('Error analyzing address poisoning:', error);
    showStatus('Error analyzing address poisoning. Please try again.', false);
    displayErrorInResults('addressPoisoningResultsContent', 'Failed to connect to the server. Please try again.');
  });
  */
}

/**
 * Analyze wallet tokens
 * @param {string} walletAddress - Wallet address
 * @param {number} numTransactions - Number of transactions to analyze
 */
function analyzeWalletTokens(walletAddress, numTransactions) {
  showStatus(`Analyzing tokens for wallet ${walletAddress}...`, true);

  fetch(`${API_BASE_URL}/wallet-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      walletAddress,
      numTransactions: parseInt(numTransactions, 10)
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showStatus('Wallet tokens analysis complete!', false, 3000);
      displayWalletTokensResults(data.data);
    } else {
      showStatus(`Error: ${data.error}`, false);
    }
  })
  .catch(error => {
    console.error('Error analyzing wallet tokens:', error);
    showStatus('Error analyzing wallet tokens. Please try again.', false);
  });
}

/**
 * Analyze block range
 * @param {number} startSlot - Start slot
 * @param {number} endSlot - End slot
 * @param {number} maxTransactions - Maximum transactions to analyze
 */
function analyzeBlockRange(startSlot, endSlot, maxTransactions) {
  showStatus(`Analyzing block range ${startSlot} to ${endSlot}...`, true);

  fetch(`${API_BASE_URL}/blocks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startSlot: parseInt(startSlot, 10),
      endSlot: parseInt(endSlot, 10),
      maxTransactions: parseInt(maxTransactions, 10)
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showStatus('Block range analysis complete!', false, 3000);
      displayBlockRangeResults(data.data);
    } else {
      showStatus(`Error: ${data.error}`, false);
    }
  })
  .catch(error => {
    console.error('Error analyzing block range:', error);
    showStatus('Error analyzing block range. Please try again.', false);
  });
}

/**
 * Analyze batch wallets
 * @param {string} walletAddresses - Comma-separated wallet addresses
 * @param {number} numTransactions - Number of transactions to analyze per wallet
 */
function analyzeBatchWallets(walletAddresses, numTransactions) {
  showStatus('Analyzing batch wallets...', true);

  fetch(`${API_BASE_URL}/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      walletAddresses: walletAddresses.split(',').map(addr => addr.trim()),
      numTransactions: parseInt(numTransactions, 10)
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showStatus('Batch wallet analysis complete!', false, 3000);
      displayBatchResults(data.data);
    } else {
      showStatus(`Error: ${data.error}`, false);
    }
  })
  .catch(error => {
    console.error('Error analyzing batch wallets:', error);
    showStatus('Error analyzing batch wallets. Please try again.', false);
  });
}

/**
 * Analyze time range
 * @param {string} walletAddress - Wallet address
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 * @param {number} maxTransactions - Maximum transactions to analyze
 */
function analyzeTimeRange(walletAddress, startTime, endTime, maxTransactions) {
  showStatus(`Analyzing time range for wallet ${walletAddress}...`, true);

  fetch(`${API_BASE_URL}/time`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      walletAddress,
      startTime,
      endTime,
      maxTransactions: parseInt(maxTransactions, 10)
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showStatus('Time range analysis complete!', false, 3000);
      displayTimeRangeResults(data.data);
    } else {
      showStatus(`Error: ${data.error}`, false);
    }
  })
  .catch(error => {
    console.error('Error analyzing time range:', error);
    showStatus('Error analyzing time range. Please try again.', false);
  });
}

/**
 * Analyze memo
 * @param {string} memoText - Memo text
 */
function analyzeMemo(memoText) {
  showStatus('Analyzing memo...', true);

  fetch(`${API_BASE_URL}/memo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      memoText
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showStatus('Memo analysis complete!', false, 3000);
      displayMemoResults(data.data);
    } else {
      showStatus(`Error: ${data.error}`, false);
    }
  })
  .catch(error => {
    console.error('Error analyzing memo:', error);
    showStatus('Error analyzing memo. Please try again.', false);
  });
}

/**
 * Display token results
 * @param {Object} results - Token analysis results
 */
function displayTokenResults(results) {
  try {
    debugLog('Displaying token results');

    const resultsContainer = document.getElementById('tokenResultsContent');

    if (!resultsContainer) {
      debugLog('Results container not found', true);
      return;
    }

    // Clear previous results
    resultsContainer.innerHTML = '';

    // Create results HTML
    let html = '';

    // Add token info
    if (results.result && results.result.tokenInfo) {
      debugLog('Displaying token info');
      const tokenInfo = results.result.tokenInfo;
      html += `
        <div class="result-card ${results.result.isSuspicious ? 'warning' : 'success'}">
          <h5>Token Information</h5>
          <div class="mb-3">
            <strong>Token Mint:</strong> ${results.tokenMint}<br>
            <strong>Name:</strong> ${tokenInfo.name || 'Unknown'}<br>
            <strong>Symbol:</strong> ${tokenInfo.symbol || 'Unknown'}<br>
            <strong>Decimals:</strong> ${tokenInfo.decimals || 'Unknown'}<br>
            <strong>Total Supply:</strong> ${tokenInfo.totalSupply || 'Unknown'}<br>
            <strong>Status:</strong>
            <span class="badge ${results.result.isSuspicious ? 'bg-warning text-dark' : 'bg-success'}">
              ${results.result.isSuspicious ? 'Suspicious' : 'Normal'}
            </span>
          </div>
        </div>
      `;

      // Add suspicious reasons if any
      if (results.result.isSuspicious && results.result.suspiciousReasons && results.result.suspiciousReasons.length > 0) {
        debugLog('Displaying suspicious reasons');
        html += `
          <div class="result-card warning">
            <h5>Suspicious Indicators</h5>
            <ul class="mb-0">
              ${results.result.suspiciousReasons.map(reason => `<li>${reason}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    } else {
      debugLog('No token info found in results', true);
      html += `
        <div class="alert alert-warning">
          <strong>Warning:</strong> No token information found in the analysis results.
        </div>
      `;
    }

    // Add transactions if any
    if (results.result && results.result.transactions && results.result.transactions.length > 0) {
      debugLog(`Displaying ${results.result.transactions.length} transactions`);
      html += `
        <div class="result-card">
          <h5>Recent Transactions</h5>
          <div class="table-responsive">
            <table class="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Signature</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${results.result.transactions.map(tx => `
                  <tr>
                    <td><small>${shortenAddress(tx.signature)}</small></td>
                    <td>${tx.type || 'TRANSFER'}</td>
                    <td>${tx.amount || 'N/A'}</td>
                    <td><small>${formatDate(tx.timestamp)}</small></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      debugLog('No transactions found in results');
    }

    // Add logs if any
    if (results.logs && results.logs.length > 0) {
      debugLog('Displaying logs');
      html += `
        <div class="result-card">
          <h5>Analysis Logs</h5>
          <div class="scrollable-content">
            <pre class="mb-0"><code>${results.logs.join('\n')}</code></pre>
          </div>
        </div>
      `;
    }

    // If no results
    if (html === '') {
      debugLog('No results found', true);
      html = '<div class="alert alert-info">No results found for this token.</div>';
    }

    // Set the HTML
    debugLog('Setting HTML content');
    resultsContainer.innerHTML = html;
    debugLog('Results displayed successfully');
  } catch (error) {
    debugLog(`Error displaying token results: ${error.message}`, true);
    console.error('Error displaying token results:', error);

    // Try to show error in results container
    try {
      const resultsContainer = document.getElementById('tokenResultsContent');
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="alert alert-danger">
            <strong>Error displaying results:</strong> ${error.message}
          </div>
          <div class="alert alert-info">
            <strong>Debug info:</strong> Check the browser console for more details.
          </div>
        `;
      }
    } catch (e) {
      console.error('Failed to display error message:', e);
    }
  }
}

/**
 * Display address poisoning results
 * @param {Object} results - Address poisoning analysis results
 */
function displayAddressPoisoningResults(results) {
  try {
    debugLog('Displaying address poisoning results');

    const resultsContainer = document.getElementById('addressPoisoningResultsContent');

    if (!resultsContainer) {
      debugLog('Address poisoning results container not found', true);
      return;
    }

    // Clear previous results
    resultsContainer.innerHTML = '';

    // Create results HTML
    let html = '';

    // Add summary info
    if (results.result) {
      const poisoningResult = results.result;

      // Risk level badge color
      let riskBadgeClass = 'bg-success';
      if (poisoningResult.riskLevel === 'HIGH') {
        riskBadgeClass = 'bg-danger';
      } else if (poisoningResult.riskLevel === 'MEDIUM') {
        riskBadgeClass = 'bg-warning text-dark';
      } else if (poisoningResult.riskLevel === 'LOW') {
        riskBadgeClass = 'bg-info';
      }

      html += `
        <div class="result-card">
          <h5>Address Poisoning Analysis</h5>
          <div class="mb-3">
            <strong>Wallet Address:</strong> ${results.walletAddress}<br>
            <strong>Transactions Analyzed:</strong> ${results.numTransactions}<br>
            <strong>Poisoning Attempts:</strong> ${poisoningResult.poisoningAttempts || 0}<br>
            <strong>Risk Level:</strong>
            <span class="badge ${riskBadgeClass}">
              ${poisoningResult.riskLevel || 'NONE'}
            </span><br>
            <strong>Risk Score:</strong> ${poisoningResult.riskScore ? poisoningResult.riskScore.toFixed(1) + '/100' : 'N/A'}<br>
          </div>
        </div>
      `;

      // Add similar addresses if any
      if (poisoningResult.similarAddresses && poisoningResult.similarAddresses.length > 0) {
        html += `
          <div class="result-card">
            <h5>Similar Addresses</h5>
            <div class="table-responsive">
              <table class="table table-sm table-striped">
                <thead>
                  <tr>
                    <th>Address Pair</th>
                    <th>Similarity</th>
                    <th>Pattern</th>
                  </tr>
                </thead>
                <tbody>
                  ${poisoningResult.similarAddresses.map(pair => `
                    <tr>
                      <td>
                        <div><small>${shortenAddress(pair.address1, 8, 8)}</small></div>
                        <div><small>${shortenAddress(pair.address2, 8, 8)}</small></div>
                      </td>
                      <td>${typeof pair.similarityScore === 'number' ? pair.similarityScore.toFixed(1) + '%' : pair.similarity || 'N/A'}</td>
                      <td>${pair.matchingPattern || 'Unknown'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      // Add poisoning attempts if any
      if (poisoningResult.addressPoisoningAttempts && poisoningResult.addressPoisoningAttempts.length > 0) {
        html += `
          <div class="result-card warning">
            <h5>Poisoning Attempts</h5>
            ${poisoningResult.addressPoisoningAttempts.map((attempt, index) => `
              <div class="mb-4">
                <h6>Attempt #${index + 1}</h6>
                <div class="mb-2">
                  <strong>Legitimate Address:</strong> <span class="text-success">${shortenAddress(attempt.legitimateAddress, 8, 8)}</span><br>
                  <strong>Poisoned Address:</strong> <span class="text-danger">${shortenAddress(attempt.poisonedAddress, 8, 8)}</span><br>
                  <strong>Similarity:</strong> ${attempt.similarity}<br>
                  <strong>Pattern:</strong> ${attempt.matchingPattern}<br>
                  <strong>Confidence:</strong> ${attempt.confidenceScore ? attempt.confidenceScore.toFixed(1) + '/100' : 'N/A'}<br>
                  <strong>Attack Vector:</strong> ${attempt.attackVector || 'Unknown'}<br>
                </div>

                ${attempt.transactions && attempt.transactions.length > 0 ? `
                  <h6 class="mt-3">Suspicious Transactions</h6>
                  <div class="table-responsive">
                    <table class="table table-sm table-striped">
                      <thead>
                        <tr>
                          <th>Signature</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${attempt.transactions.map(tx => `
                          <tr>
                            <td><small>${shortenAddress(tx.signature)}</small></td>
                            <td>${tx.type || 'TRANSFER'}</td>
                            <td>${tx.amount || 'N/A'}</td>
                            <td><small>${formatDate(tx.timestamp)}</small></td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                ` : '<p>No suspicious transactions found.</p>'}
              </div>
            `).join('')}
          </div>
        `;
      }

      // Add recommendations
      html += `
        <div class="result-card info">
          <h5>Recommendations</h5>
          <ul>
            <li>Always verify the <strong>entire address</strong> when sending funds, not just the first and last few characters</li>
            <li>Use the address book feature in your wallet to save legitimate addresses</li>
            <li>Send a small test transaction before sending large amounts</li>
            <li>Consider using a hardware wallet with address verification</li>
            <li>Be especially cautious when sending to addresses that look similar to your frequent contacts</li>
          </ul>
        </div>
      `;
    }

    // Add logs if any
    if (results.logs && results.logs.length > 0) {
      html += `
        <div class="result-card">
          <h5>Analysis Logs</h5>
          <div class="scrollable-content">
            <pre class="mb-0"><code>${results.logs.join('\n')}</code></pre>
          </div>
        </div>
      `;
    }

    // If no results
    if (html === '') {
      html = '<div class="alert alert-info">No results found for this analysis.</div>';
    }

    // Set the HTML
    resultsContainer.innerHTML = html;
    debugLog('Address poisoning results displayed successfully');
  } catch (error) {
    debugLog(`Error displaying address poisoning results: ${error.message}`, true);
    console.error('Error displaying address poisoning results:', error);

    // Try to show error in results container
    try {
      const resultsContainer = document.getElementById('addressPoisoningResultsContent');
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="alert alert-danger">
            <strong>Error displaying results:</strong> ${error.message}
          </div>
          <div class="alert alert-info">
            <strong>Debug info:</strong> Check the browser console for more details.
          </div>
        `;
      }
    } catch (e) {
      console.error('Failed to display error message:', e);
    }
  }
}

/**
 * Display transaction results
 * @param {Object} results - Transaction analysis results
 */
function displayTransactionResults(results) {
  console.log('Transaction results:', results);

  const resultsContainer = document.getElementById('transactionResultsContent');

  if (!resultsContainer) {
    console.error('Results container not found');
    return;
  }

  // Clear previous results
  resultsContainer.innerHTML = '';

  // Create results HTML
  let html = '';

  // Add transaction info
  if (results.result && results.result.transactionInfo) {
    const txInfo = results.result.transactionInfo;
    html += `
      <div class="result-card ${results.result.isDustingAttack ? 'warning' : 'success'}">
        <h5>Transaction Information</h5>
        <div class="mb-3">
          <strong>Signature:</strong> ${results.signature}<br>
          <strong>Block Time:</strong> ${formatDate(txInfo.blockTime)}<br>
          <strong>Slot:</strong> ${txInfo.slot || 'Unknown'}<br>
          <strong>Fee:</strong> ${txInfo.fee ? (txInfo.fee / 1000000000).toFixed(9) + ' SOL' : 'Unknown'}<br>
          <strong>Status:</strong> ${txInfo.status || 'Unknown'}<br>
          <strong>Dusting Attack:</strong>
          <span class="badge ${results.result.isDustingAttack ? 'bg-warning text-dark' : 'bg-success'}">
            ${results.result.isDustingAttack ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    `;
  }

  // Add transfers if any
  if (results.result && results.result.transfers && results.result.transfers.length > 0) {
    html += `
      <div class="result-card">
        <h5>Transfers</h5>
        <div class="table-responsive">
          <table class="table table-sm table-striped">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Dusting</th>
              </tr>
            </thead>
            <tbody>
              ${results.result.transfers.map(transfer => `
                <tr>
                  <td>${transfer.type || 'Unknown'}</td>
                  <td>${transfer.amount || 'N/A'}</td>
                  <td><small>${shortenAddress(transfer.sender)}</small></td>
                  <td><small>${shortenAddress(transfer.receiver)}</small></td>
                  <td>
                    <span class="badge ${transfer.isDusting ? 'bg-warning text-dark' : 'bg-success'}">
                      ${transfer.isDusting ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Add memo if any
  if (results.result && results.result.memo) {
    html += `
      <div class="result-card">
        <h5>Memo</h5>
        <div class="p-2 bg-light rounded">
          <code>${results.result.memo}</code>
        </div>
      </div>
    `;
  }

  // Add logs if any
  if (results.logs && results.logs.length > 0) {
    html += `
      <div class="result-card">
        <h5>Analysis Logs</h5>
        <div class="scrollable-content">
          <pre class="mb-0"><code>${results.logs.join('\n')}</code></pre>
        </div>
      </div>
    `;
  }

  // If no results
  if (html === '') {
    html = '<div class="alert alert-info">No results found for this transaction.</div>';
  }

  // Set the HTML
  resultsContainer.innerHTML = html;
}

/**
 * Display wallet results
 * @param {Object} results - Wallet analysis results
 */
function displayWalletResults(results) {
  console.log('Wallet results:', results);

  let resultsContainer = document.getElementById('walletResultsContent');

  if (!resultsContainer) {
    console.warn('Results container not found, trying to create it');

    // Try to find or create the parent container
    let walletResults = document.getElementById('walletResults');

    if (!walletResults) {
      // Create the results container
      const tabPane = document.getElementById('wallet-tab-pane');
      if (tabPane) {
        walletResults = document.createElement('div');
        walletResults.id = 'walletResults';
        walletResults.className = 'mt-4';

        const heading = document.createElement('h5');
        heading.textContent = 'Analysis Results';

        const card = document.createElement('div');
        card.className = 'card';

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        cardBody.id = 'walletResultsContent';

        card.appendChild(cardBody);
        walletResults.appendChild(heading);
        walletResults.appendChild(card);

        // Append after the form or to the tab pane
        const walletForm = document.getElementById('walletForm');
        if (walletForm) {
          walletForm.after(walletResults);
        } else {
          tabPane.appendChild(walletResults);
        }

        console.log('Created wallet results container');
        resultsContainer = cardBody;
      } else {
        console.error('Cannot find or create wallet tab pane');
        showStatus('Error: Cannot display results', false);
        return;
      }
    } else {
      // The container exists but the content container doesn't
      const card = document.createElement('div');
      card.className = 'card';

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';
      cardBody.id = 'walletResultsContent';

      card.appendChild(cardBody);
      walletResults.appendChild(card);

      console.log('Created wallet results content container');
      resultsContainer = cardBody;
    }

    // Make sure the container is visible
    walletResults.classList.remove('d-none');
  }

  // Clear previous results
  resultsContainer.innerHTML = '';

  // Create results HTML
  let html = '';

  // Add wallet summary
  if (results.result) {
    const classification = results.result.classification || 'UNKNOWN';
    const classColor = classification === 'VICTIM' ? 'danger' :
                       classification === 'ATTACKER' ? 'primary' :
                       classification === 'NEUTRAL' ? 'secondary' : 'info';

    html += `
      <div class="result-card ${results.result.dustingAttacks > 0 ? 'warning' : 'success'}">
        <h5>Wallet Summary</h5>
        <div class="mb-3">
          <strong>Address:</strong> ${results.walletAddress}<br>
          <strong>Classification:</strong>
          <span class="badge bg-${classColor}">
            ${classification}
          </span><br>
          <strong>Dusting Attacks:</strong> ${results.result.dustingAttacks || 0}<br>
          <strong>Total Transactions Analyzed:</strong> ${results.result.totalTransactions || results.numTransactions || 0}<br>
          <strong>Dusting Percentage:</strong> ${results.result.dustingPercentage || 0}%
        </div>
      </div>
    `;

    // Add risk assessment if available
    if (results.result.riskAssessment) {
      html += `
        <div class="result-card">
          <h5>Risk Assessment</h5>
          <div class="mb-3">
            <strong>Risk Level:</strong>
            <span class="badge badge-risk-${results.result.riskAssessment.level.toLowerCase()}">
              ${results.result.riskAssessment.level}
            </span><br>
            <strong>Risk Score:</strong> ${results.result.riskAssessment.score}/10<br>
            <strong>Recommendation:</strong> ${results.result.riskAssessment.recommendation || 'No specific recommendation'}
          </div>
        </div>
      `;
    }
  }

  // Add transactions if any
  if (results.result && results.result.transactions && results.result.transactions.length > 0) {
    html += `
      <div class="result-card">
        <h5>Recent Transactions</h5>
        <div class="table-responsive">
          <table class="table table-sm table-striped">
            <thead>
              <tr>
                <th>Signature</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Direction</th>
                <th>Timestamp</th>
                <th>Dusting</th>
              </tr>
            </thead>
            <tbody>
              ${results.result.transactions.map(tx => {
                const isIncoming = tx.receiver === results.walletAddress;
                return `
                  <tr>
                    <td><small>${shortenAddress(tx.signature)}</small></td>
                    <td>${tx.type || 'TRANSFER'}</td>
                    <td>${tx.amount || 'N/A'}</td>
                    <td>
                      <span class="badge ${isIncoming ? 'bg-success' : 'bg-primary'}">
                        ${isIncoming ? 'IN' : 'OUT'}
                      </span>
                    </td>
                    <td><small>${formatDate(tx.timestamp)}</small></td>
                    <td>
                      <span class="badge ${tx.isDustingAttack ? 'bg-warning text-dark' : 'bg-success'}">
                        ${tx.isDustingAttack ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Add logs if any
  if (results.logs && results.logs.length > 0) {
    html += `
      <div class="result-card">
        <h5>Analysis Logs</h5>
        <div class="scrollable-content">
          <pre class="mb-0"><code>${results.logs.join('\n')}</code></pre>
        </div>
      </div>
    `;
  }

  // If no results
  if (html === '') {
    html = '<div class="alert alert-info">No results found for this wallet.</div>';
  }

  // Set the HTML
  resultsContainer.innerHTML = html;
}

/**
 * Display address poisoning results
 * @param {Object} results - Address poisoning analysis results
 */
function displayAddressPoisoningResults(results) {
  console.log('Address poisoning results:', results);

  let resultsContainer = document.getElementById('addressPoisoningResultsContent');

  if (!resultsContainer) {
    console.warn('Address poisoning results container not found, trying to create it');

    // Try to find or create the parent container
    let poisoningResults = document.getElementById('addressPoisoningResults');

    if (!poisoningResults) {
      // Create the results container
      const tabPane = document.getElementById('address-poisoning-tab-pane');
      if (tabPane) {
        poisoningResults = document.createElement('div');
        poisoningResults.id = 'addressPoisoningResults';
        poisoningResults.className = 'mt-4';

        const heading = document.createElement('h5');
        heading.textContent = 'Analysis Results';

        const card = document.createElement('div');
        card.className = 'card';

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        cardBody.id = 'addressPoisoningResultsContent';

        card.appendChild(cardBody);
        poisoningResults.appendChild(heading);
        poisoningResults.appendChild(card);

        // Append after the form or to the tab pane
        const poisoningForm = document.getElementById('addressPoisoningForm');
        if (poisoningForm) {
          poisoningForm.after(poisoningResults);
        } else {
          tabPane.appendChild(poisoningResults);
        }

        console.log('Created address poisoning results container');
        resultsContainer = cardBody;
      } else {
        console.error('Cannot find or create address poisoning tab pane');
        showStatus('Error: Cannot display results', false);
        return;
      }
    } else {
      // The container exists but the content container doesn't
      const card = document.createElement('div');
      card.className = 'card';

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';
      cardBody.id = 'addressPoisoningResultsContent';

      card.appendChild(cardBody);
      poisoningResults.appendChild(card);

      console.log('Created address poisoning results content container');
      resultsContainer = cardBody;
    }

    // Make sure the container is visible
    poisoningResults.classList.remove('d-none');
  }

  // Clear previous results
  resultsContainer.innerHTML = '';

  // Create results HTML
  let html = '';

  // Add summary
  if (results.result) {
    const riskLevel = results.result.riskLevel || 'UNKNOWN';
    const riskColor = riskLevel === 'HIGH' ? 'danger' :
                      riskLevel === 'MEDIUM' ? 'warning' :
                      riskLevel === 'LOW' ? 'info' : 'success';

    html += `
      <div class="result-card ${results.result.isPoisoningTarget ? 'warning' : 'success'}">
        <h5>Address Poisoning Summary</h5>
        <div class="mb-3">
          <strong>Wallet Address:</strong> ${results.walletAddress}<br>
          <strong>Poisoning Target:</strong>
          <span class="badge ${results.result.isPoisoningTarget ? 'bg-warning text-dark' : 'bg-success'}">
            ${results.result.isPoisoningTarget ? 'Yes' : 'No'}
          </span><br>
          <strong>Poisoning Attempts:</strong> ${results.result.poisoningAttempts || 0}<br>
          <strong>Total Transactions Analyzed:</strong> ${results.result.totalTransactions || results.numTransactions || 0}<br>
          <strong>Poisoning Percentage:</strong> ${results.result.poisoningPercentage || 0}%<br>
          <strong>Risk Score:</strong> ${results.result.riskScore || 0}/10<br>
          <strong>Risk Level:</strong>
          <span class="badge bg-${riskColor}">
            ${riskLevel}
          </span>
        </div>
      </div>
    `;

    // Add similar addresses if any
    if (results.result.similarAddresses && results.result.similarAddresses.length > 0) {
      html += `
        <div class="result-card warning">
          <h5>Similar Addresses (Potential Attackers)</h5>
          <div class="table-responsive">
            <table class="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Similarity</th>
                  <th>Transactions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${results.result.similarAddresses.map(addr => `
                  <tr>
                    <td><small>${addr.address}</small></td>
                    <td>${(addr.similarity * 100).toFixed(1)}%</td>
                    <td>${addr.transactions || 0}</td>
                    <td>
                      <span class="badge ${addr.isAttacker ? 'bg-danger' : 'bg-secondary'}">
                        ${addr.isAttacker ? 'Attacker' : 'Suspicious'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // Add suspicious transactions if any
    if (results.result.suspiciousTransactions && results.result.suspiciousTransactions.length > 0) {
      html += `
        <div class="result-card warning">
          <h5>Suspicious Transactions</h5>
          <div class="table-responsive">
            <table class="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Signature</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Sender</th>
                  <th>Receiver</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${results.result.suspiciousTransactions.map(tx => `
                  <tr>
                    <td><small>${shortenAddress(tx.signature)}</small></td>
                    <td>${tx.type || 'TRANSFER'}</td>
                    <td>${tx.amount || 'N/A'}</td>
                    <td><small>${shortenAddress(tx.sender)}</small></td>
                    <td><small>${shortenAddress(tx.receiver)}</small></td>
                    <td><small>${formatDate(tx.timestamp)}</small></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // Add recommendations if any
    if (results.result.recommendations && results.result.recommendations.length > 0) {
      html += `
        <div class="result-card">
          <h5>Recommendations</h5>
          <ul class="mb-0">
            ${results.result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      `;
    }
  }

  // Add logs if any
  if (results.logs && results.logs.length > 0) {
    html += `
      <div class="result-card">
        <h5>Analysis Logs</h5>
        <div class="scrollable-content">
          <pre class="mb-0"><code>${results.logs.join('\n')}</code></pre>
        </div>
      </div>
    `;
  }

  // If no results
  if (html === '') {
    html = '<div class="alert alert-info">No address poisoning results found for this wallet.</div>';
  }

  // Set the HTML
  resultsContainer.innerHTML = html;
}

/**
 * Display wallet tokens results
 * @param {Object} results - Wallet tokens analysis results
 */
function displayWalletTokensResults(results) {
  // Implement wallet tokens results display
  console.log('Wallet tokens results:', results);

  // For now, just show a message
  showStatus('Wallet tokens analysis results displayed in console', false, 3000);
}

/**
 * Display block range results
 * @param {Object} results - Block range analysis results
 */
function displayBlockRangeResults(results) {
  // Implement block range results display
  console.log('Block range results:', results);

  // For now, just show a message
  showStatus('Block range analysis results displayed in console', false, 3000);
}

/**
 * Display batch results
 * @param {Object} results - Batch analysis results
 */
function displayBatchResults(results) {
  // Implement batch results display
  console.log('Batch results:', results);

  // For now, just show a message
  showStatus('Batch analysis results displayed in console', false, 3000);
}

/**
 * Display time range results
 * @param {Object} results - Time range analysis results
 */
function displayTimeRangeResults(results) {
  // Implement time range results display
  console.log('Time range results:', results);

  // For now, just show a message
  showStatus('Time range analysis results displayed in console', false, 3000);
}

/**
 * Display memo results
 * @param {Object} results - Memo analysis results
 */
function displayMemoResults(results) {
  // Implement memo results display
  console.log('Memo results:', results);

  // For now, just show a message
  showStatus('Memo analysis results displayed in console', false, 3000);
}

/**
 * Debug function to log messages to console and UI
 * @param {string} message - Message to log
 * @param {boolean} isError - Whether this is an error message
 */
function debugLog(message, isError = false) {
  try {
    // Always log to console
    if (isError) {
      console.error('DEBUG:', message);
    } else {
      console.log('DEBUG:', message);
    }

    // Try to log to UI if debug element exists
    try {
      const debugElement = document.getElementById('debugOutput');
      if (debugElement) {
        const msgElement = document.createElement('div');
        msgElement.className = isError ? 'text-danger' : 'text-info';
        msgElement.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        debugElement.appendChild(msgElement);

        // Scroll to bottom
        debugElement.scrollTop = debugElement.scrollHeight;
      }
    } catch (uiError) {
      console.error('Error logging to UI:', uiError);
    }
  } catch (error) {
    // Last resort fallback
    console.error('Critical error in debugLog:', error);
  }
}

/**
 * Show status message
 * @param {string} message - Status message
 * @param {boolean} loading - Whether to show loading spinner
 * @param {number} timeout - Timeout in milliseconds (0 for no timeout)
 */
function showStatus(message, loading, timeout = 0) {
  try {
    // Log the status message
    try {
      debugLog(`Status: ${message} (loading: ${loading})`);
    } catch (logError) {
      console.error('Error logging status:', logError);
    }

    // Try to update the status UI
    try {
      const statusMessages = document.getElementById('statusMessages');
      if (!statusMessages) {
        console.warn('Status messages element not found');
        return;
      }

      const statusText = document.getElementById('statusText');
      if (!statusText) {
        console.warn('Status text element not found');
        return;
      }

      const spinner = statusMessages.querySelector('.spinner-border');
      if (!spinner) {
        console.warn('Spinner element not found');
        // Continue anyway, we can still show the message
      }

      // Update the status message
      statusText.textContent = message;
      statusMessages.classList.remove('d-none');

      // Update the spinner if it exists
      if (spinner) {
        if (loading) {
          spinner.classList.remove('d-none');
        } else {
          spinner.classList.add('d-none');
        }
      }

      // Set timeout to hide the message if needed
      if (timeout > 0) {
        setTimeout(function() {
          statusMessages.classList.add('d-none');
        }, timeout);
      }
    } catch (uiError) {
      console.error('Error updating status UI:', uiError);

      // Try to show a fallback message
      try {
        // Create a temporary status message if the normal one doesn't work
        const body = document.body;
        if (body) {
          const tempStatus = document.createElement('div');
          tempStatus.style.position = 'fixed';
          tempStatus.style.top = '10px';
          tempStatus.style.left = '50%';
          tempStatus.style.transform = 'translateX(-50%)';
          tempStatus.style.padding = '10px 20px';
          tempStatus.style.backgroundColor = loading ? '#007bff' : '#28a745';
          tempStatus.style.color = 'white';
          tempStatus.style.borderRadius = '5px';
          tempStatus.style.zIndex = '9999';
          tempStatus.textContent = message;

          body.appendChild(tempStatus);

          if (timeout > 0) {
            setTimeout(function() {
              body.removeChild(tempStatus);
            }, timeout);
          }
        }
      } catch (fallbackError) {
        console.error('Error showing fallback status:', fallbackError);
      }
    }
  } catch (error) {
    // Last resort fallback
    console.error('Critical error in showStatus:', error);
  }
}

/**
 * Display error in results container
 * @param {string} containerId - ID of the container to display error in
 * @param {string} errorMessage - Error message to display
 */
function displayErrorInResults(containerId, errorMessage) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <strong>Error:</strong> ${errorMessage}
      </div>
    `;

    // Make sure the parent container is visible
    const parentContainer = container.closest('.d-none');
    if (parentContainer) {
      parentContainer.classList.remove('d-none');
    }
  }
}

/**
 * Format date for display
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Shorten address for display
 * @param {string} address - Address to shorten
 * @param {number} startChars - Number of characters to show at the start
 * @param {number} endChars - Number of characters to show at the end
 * @returns {string} Shortened address
 */
function shortenAddress(address, startChars = 4, endChars = 4) {
  if (!address) return 'N/A';

  if (address.length <= startChars + endChars + 3) {
    return address;
  }

  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}
