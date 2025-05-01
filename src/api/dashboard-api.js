/**
 * Dashboard API
 *
 * This module provides API endpoints for the dashboard.
 */

const express = require('express');
const router = express.Router();
const {
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
} = require('../dashboard/dashboard-data-collector');

// Initialize data storage
initializeDataStorage();

// Custom response handler to standardize API responses
const createApiResponse = (success, data = null, error = null) => {
  return {
    success,
    timestamp: new Date().toISOString(),
    data,
    error
  };
};

/**
 * @swagger
 * /v1/api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Returns aggregated statistics for the dashboard
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Server error
 */
router.get('/stats', (req, res) => {
  try {
    const stats = getDashboardStats();
    res.json(createApiResponse(true, stats));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/dashboard/time-series:
 *   get:
 *     summary: Get time series data
 *     description: Returns time series data for dashboard charts
 *     tags:
 *       - Dashboard
 *     parameters:
 *       - in: query
 *         name: dataType
 *         schema:
 *           type: string
 *           enum: [tokens, transactions, wallets, addressPoisoning]
 *         required: true
 *         description: Type of data to retrieve
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         required: false
 *         description: Timeframe for grouping data (default is day)
 *     responses:
 *       200:
 *         description: Time series data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.get('/time-series', (req, res) => {
  try {
    const { dataType, timeframe = 'day' } = req.query;

    if (!dataType || !['tokens', 'transactions', 'wallets', 'addressPoisoning'].includes(dataType)) {
      return res.status(400).json(createApiResponse(false, null, 'Invalid data type. Must be one of: tokens, transactions, wallets, addressPoisoning'));
    }

    if (!['day', 'week', 'month'].includes(timeframe)) {
      return res.status(400).json(createApiResponse(false, null, 'Invalid timeframe. Must be one of: day, week, month'));
    }

    const data = getTimeSeriesData(dataType, timeframe);
    res.json(createApiResponse(true, data));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/dashboard/collect/token:
 *   post:
 *     summary: Collect token analysis data
 *     description: Analyzes a token and stores the results for dashboard visualization
 *     tags:
 *       - Dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tokenMint]
 *             properties:
 *               tokenMint:
 *                 type: string
 *                 description: Token mint address to analyze
 *               maxTransactions:
 *                 type: integer
 *                 description: Maximum number of transactions to analyze (default is 50)
 *     responses:
 *       200:
 *         description: Token analysis data collected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/collect/token', async (req, res) => {
  try {
    const { tokenMint, maxTransactions = 50 } = req.body;

    if (!tokenMint) {
      return res.status(400).json(createApiResponse(false, null, 'Token mint address is required'));
    }

    const result = await collectTokenAnalysisData(tokenMint, maxTransactions);
    res.json(createApiResponse(true, { message: 'Token analysis data collected', tokenMint }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/dashboard/collect/transaction:
 *   post:
 *     summary: Collect transaction analysis data
 *     description: Analyzes a transaction and stores the results for dashboard visualization
 *     tags:
 *       - Dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [signature]
 *             properties:
 *               signature:
 *                 type: string
 *                 description: Transaction signature to analyze
 *     responses:
 *       200:
 *         description: Transaction analysis data collected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/collect/transaction', async (req, res) => {
  try {
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json(createApiResponse(false, null, 'Transaction signature is required'));
    }

    const result = await collectTransactionAnalysisData(signature);
    res.json(createApiResponse(true, { message: 'Transaction analysis data collected', signature }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/dashboard/collect/wallet:
 *   post:
 *     summary: Collect wallet analysis data
 *     description: Analyzes a wallet and stores the results for dashboard visualization
 *     tags:
 *       - Dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [walletAddress]
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: Wallet address to analyze
 *               numTransactions:
 *                 type: integer
 *                 description: Number of transactions to analyze (default is 10)
 *     responses:
 *       200:
 *         description: Wallet analysis data collected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/collect/wallet', async (req, res) => {
  try {
    const { walletAddress, numTransactions = 10 } = req.body;

    if (!walletAddress) {
      return res.status(400).json(createApiResponse(false, null, 'Wallet address is required'));
    }

    const result = await collectWalletAnalysisData(walletAddress, numTransactions);
    res.json(createApiResponse(true, { message: 'Wallet analysis data collected', walletAddress }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/dashboard/collect/address-poisoning:
 *   post:
 *     summary: Collect address poisoning analysis data
 *     description: Analyzes a wallet for address poisoning attempts and stores the results for dashboard visualization
 *     tags:
 *       - Dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [walletAddress]
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: Wallet address to analyze for address poisoning attempts
 *               numTransactions:
 *                 type: integer
 *                 description: Number of transactions to analyze (default is 50)
 *     responses:
 *       200:
 *         description: Address poisoning analysis data collected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/collect/address-poisoning', async (req, res) => {
  try {
    const { walletAddress, numTransactions = 50 } = req.body;

    if (!walletAddress) {
      return res.status(400).json(createApiResponse(false, null, 'Wallet address is required'));
    }

    const result = await collectAddressPoisoningData(walletAddress, numTransactions);
    res.json(createApiResponse(true, { message: 'Address poisoning analysis data collected', walletAddress }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/dashboard/collect/wallet-tokens:
 *   post:
 *     summary: Collect wallet tokens analysis data
 *     description: Analyzes tokens in a wallet and stores the results for dashboard visualization
 *     tags:
 *       - Dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [walletAddress]
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: Wallet address to analyze tokens for
 *               numTransactions:
 *                 type: integer
 *                 description: Number of transactions to analyze (0 for token analysis only)
 *     responses:
 *       200:
 *         description: Wallet tokens analysis data collected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/collect/wallet-tokens', async (req, res) => {
  try {
    const { walletAddress, numTransactions = 0 } = req.body;

    if (!walletAddress) {
      return res.status(400).json(createApiResponse(false, null, 'Wallet address is required'));
    }

    const result = await collectWalletTokensData(walletAddress, numTransactions);
    res.json(createApiResponse(true, { message: 'Wallet tokens analysis data collected', walletAddress }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/dashboard/collect/blocks:
 *   post:
 *     summary: Collect block range analysis data
 *     description: Analyzes a range of blocks and stores the results for dashboard visualization
 *     tags:
 *       - Dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startSlot, endSlot]
 *             properties:
 *               startSlot:
 *                 type: integer
 *                 description: Starting slot number
 *               endSlot:
 *                 type: integer
 *                 description: Ending slot number
 *               maxTransactions:
 *                 type: integer
 *                 description: Maximum number of transactions to analyze (default is 100)
 *     responses:
 *       200:
 *         description: Block range analysis data collected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/collect/blocks', async (req, res) => {
  try {
    const { startSlot, endSlot, maxTransactions = 100 } = req.body;

    if (!startSlot || !endSlot) {
      return res.status(400).json(createApiResponse(false, null, 'Start and end slots are required'));
    }

    if (startSlot > endSlot) {
      return res.status(400).json(createApiResponse(false, null, 'Start slot must be less than or equal to end slot'));
    }

    const result = await collectBlockRangeData(startSlot, endSlot, maxTransactions);
    res.json(createApiResponse(true, { message: 'Block range analysis data collected', startSlot, endSlot }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/dashboard/collect/batch:
 *   post:
 *     summary: Collect batch wallet analysis data
 *     description: Analyzes multiple wallets and stores the results for dashboard visualization
 *     tags:
 *       - Dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [wallets]
 *             properties:
 *               wallets:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of wallet addresses to analyze
 *               numTransactions:
 *                 type: integer
 *                 description: Number of transactions to analyze per wallet (default is 10)
 *     responses:
 *       200:
 *         description: Batch wallet analysis data collected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/collect/batch', async (req, res) => {
  try {
    const { wallets, numTransactions = 10 } = req.body;

    if (!wallets || !Array.isArray(wallets) || wallets.length === 0) {
      return res.status(400).json(createApiResponse(false, null, 'Array of wallet addresses is required'));
    }

    const result = await collectBatchData(wallets, numTransactions);
    res.json(createApiResponse(true, { message: 'Batch wallet analysis data collected', walletCount: wallets.length }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/dashboard/collect/time:
 *   post:
 *     summary: Collect time range analysis data
 *     description: Analyzes transactions within a time range and stores the results for dashboard visualization
 *     tags:
 *       - Dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [walletAddress, startTime, endTime]
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: Wallet address to analyze
 *               startTime:
 *                 type: string
 *                 description: Start time (date string or Unix timestamp)
 *               endTime:
 *                 type: string
 *                 description: End time (date string or Unix timestamp)
 *               maxTransactions:
 *                 type: integer
 *                 description: Maximum number of transactions to analyze (default is 50)
 *     responses:
 *       200:
 *         description: Time range analysis data collected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/collect/time', async (req, res) => {
  try {
    const { walletAddress, startTime, endTime, maxTransactions = 50 } = req.body;

    if (!walletAddress) {
      return res.status(400).json(createApiResponse(false, null, 'Wallet address is required'));
    }

    if (!startTime || !endTime) {
      return res.status(400).json(createApiResponse(false, null, 'Start time and end time are required'));
    }

    const result = await collectTimeRangeData(walletAddress, startTime, endTime, maxTransactions);
    res.json(createApiResponse(true, { message: 'Time range analysis data collected', walletAddress, startTime, endTime }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/dashboard/collect/memo:
 *   post:
 *     summary: Collect memo analysis data from transaction
 *     description: Analyzes a memo in a transaction and stores the results for dashboard visualization
 *     tags:
 *       - Dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [signature]
 *             properties:
 *               signature:
 *                 type: string
 *                 description: Transaction signature containing the memo to analyze
 *     responses:
 *       200:
 *         description: Memo analysis data collected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/collect/memo', async (req, res) => {
  try {
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json(createApiResponse(false, null, 'Transaction signature is required'));
    }

    const result = await collectMemoData(signature);
    res.json(createApiResponse(true, { message: 'Memo analysis data collected', signature }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/dashboard/collect/memo-text:
 *   post:
 *     summary: Collect memo text analysis data
 *     description: Analyzes memo text directly and stores the results for dashboard visualization
 *     tags:
 *       - Dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memoText]
 *             properties:
 *               memoText:
 *                 type: string
 *                 description: Memo text to analyze
 *     responses:
 *       200:
 *         description: Memo text analysis data collected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/collect/memo-text', async (req, res) => {
  try {
    const { memoText } = req.body;

    if (!memoText) {
      return res.status(400).json(createApiResponse(false, null, 'Memo text is required'));
    }

    const result = await collectMemoTextData(memoText);
    res.json(createApiResponse(true, { message: 'Memo text analysis data collected' }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

module.exports = router;
