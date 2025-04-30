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

module.exports = router;
