/**
 * Solana Spam Detector API Server
 *
 * This server provides API endpoints for detecting spam and dusting attacks on the Solana blockchain.
 * It exposes the functionality of the Solana Spam Detector as RESTful API endpoints.
 */

// Import required modules
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Import analyzer modules
const { detectDustingAttacks, analyzeWalletTokens } = require('./wallet-analyzer');
const { analyzeTransaction } = require('./transaction-analyzer');
const { analyzeBlockRange } = require('./block-analyzer');
const { analyzeTokenMint } = require('./token-analyzer');
const { analyzeBatchWallets } = require('./batch-analyzer');
const { analyzeTimeRange } = require('./time-analyzer');
const { analyzeMemo, analyzeMemoList } = require('./memo-analyzer');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(morgan('combined')); // Logging

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to all API routes
app.use('/v1/api', apiLimiter);

// Swagger documentation setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Solana Spam Detector API',
      version: '1.0.0',
      description: 'API for detecting spam and dusting attacks on Solana blockchain',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    security: [
      {
        rateLimiting: []
      }
    ],
    components: {
      securitySchemes: {
        rateLimiting: {
          type: 'apiKey',
          name: 'X-Rate-Limit',
          in: 'header',
          description: 'Rate limiting is applied to all API endpoints. 100 requests per 15-minute window per IP address.'
        }
      },
      schemas: {
        WalletAnalysisRequest: {
          type: 'object',
          required: ['walletAddress'],
          properties: {
            walletAddress: {
              type: 'string',
              description: 'Solana wallet address to analyze'
            },
            numTransactions: {
              type: 'integer',
              description: 'Number of transactions to analyze (default: 10)'
            }
          }
        },
        TransactionAnalysisRequest: {
          type: 'object',
          required: ['signature'],
          properties: {
            signature: {
              type: 'string',
              description: 'Transaction signature to analyze'
            }
          }
        },
        BlockRangeAnalysisRequest: {
          type: 'object',
          required: ['startSlot', 'endSlot'],
          properties: {
            startSlot: {
              type: 'integer',
              description: 'Starting slot number'
            },
            endSlot: {
              type: 'integer',
              description: 'Ending slot number'
            },
            maxTransactions: {
              type: 'integer',
              description: 'Maximum number of transactions to analyze (default: 100)'
            }
          }
        },
        TokenAnalysisRequest: {
          type: 'object',
          required: ['tokenMint'],
          properties: {
            tokenMint: {
              type: 'string',
              description: 'Token mint address to analyze'
            },
            maxTransactions: {
              type: 'integer',
              description: 'Maximum number of transactions to analyze (default: 50)'
            }
          }
        },
        BatchAnalysisRequest: {
          type: 'object',
          required: ['wallets'],
          properties: {
            wallets: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of wallet addresses to analyze'
            },
            numTransactions: {
              type: 'integer',
              description: 'Number of transactions to analyze per wallet (default: 10)'
            }
          }
        },
        TimeRangeAnalysisRequest: {
          type: 'object',
          required: ['walletAddress', 'startTime', 'endTime'],
          properties: {
            walletAddress: {
              type: 'string',
              description: 'Solana wallet address to analyze'
            },
            startTime: {
              type: 'string',
              description: 'Start time (Unix timestamp or date string like "2022-01-01")'
            },
            endTime: {
              type: 'string',
              description: 'End time (Unix timestamp or date string like "2022-12-31")'
            },
            maxTransactions: {
              type: 'integer',
              description: 'Maximum number of transactions to analyze (default: 50)'
            }
          }
        },
        WalletTokensAnalysisRequest: {
          type: 'object',
          required: ['walletAddress'],
          properties: {
            walletAddress: {
              type: 'string',
              description: 'Solana wallet address to analyze'
            }
          }
        },
        MemoAnalysisRequest: {
          type: 'object',
          required: ['signature'],
          properties: {
            signature: {
              type: 'string',
              description: 'Transaction signature to analyze for memo content'
            }
          }
        },
        MemoBatchAnalysisRequest: {
          type: 'object',
          required: ['memos'],
          properties: {
            memos: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of memo texts to analyze'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'ISO-8601 timestamp of when the response was generated'
            },
            data: {
              type: 'object',
              description: 'Response data (present on successful requests)'
            },
            error: {
              type: 'string',
              description: 'Error message (present on failed requests)'
            }
          }
        }
      }
    }
  },
  apis: ['./api-server.js'] // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Custom response handler to standardize API responses
const createApiResponse = (success, data = null, error = null) => {
  return {
    success,
    timestamp: new Date().toISOString(),
    data,
    error
  };
};

// Capture console output for API responses
class OutputCapture {
  constructor() {
    this.logs = [];
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
  }

  start() {
    console.log = (...args) => {
      this.logs.push(args.join(' '));
    };
    console.error = (...args) => {
      this.logs.push(`ERROR: ${args.join(' ')}`);
    };
  }

  stop() {
    console.log = this.originalConsoleLog;
    console.error = this.originalConsoleError;
    return this.logs;
  }
}

/**
 * @swagger
 * /v1/api/health:
 *   get:
 *     summary: Check API health
 *     description: Returns the health status of the API
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               timestamp: "2023-05-15T12:34:56.789Z"
 *               data:
 *                 status: "healthy"
 *                 version: "1.0.0"
 */
app.get('/v1/api/health', (req, res) => {
  res.json(createApiResponse(true, {
    status: 'healthy',
    version: '1.0.0'
  }));
});

/**
 * @swagger
 * /v1/api/wallet:
 *   post:
 *     summary: Analyze a wallet for dusting attacks
 *     description: Analyzes a Solana wallet address to detect potential dusting attacks
 *     tags:
 *       - Wallet Analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WalletAnalysisRequest'
 *           example:
 *             walletAddress: "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg"
 *             numTransactions: 20
 *     responses:
 *       200:
 *         description: Wallet analysis results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
app.post('/v1/api/wallet', async (req, res) => {
  try {
    const { walletAddress, numTransactions = 10 } = req.body;

    if (!walletAddress) {
      return res.status(400).json(createApiResponse(false, null, 'Wallet address is required'));
    }

    // Capture console output
    const outputCapture = new OutputCapture();
    outputCapture.start();

    // Run the analysis
    const result = await detectDustingAttacks(walletAddress, numTransactions);

    // Get captured logs
    const logs = outputCapture.stop();

    // Return the response
    res.json(createApiResponse(true, {
      walletAddress,
      numTransactions,
      result,
      logs
    }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/transaction:
 *   post:
 *     summary: Analyze a transaction for dusting attacks
 *     description: Analyzes a Solana transaction to detect potential dusting attacks
 *     tags:
 *       - Transaction Analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionAnalysisRequest'
 *           example:
 *             signature: "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf"
 *     responses:
 *       200:
 *         description: Transaction analysis results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
app.post('/v1/api/transaction', async (req, res) => {
  try {
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json(createApiResponse(false, null, 'Transaction signature is required'));
    }

    // Capture console output
    const outputCapture = new OutputCapture();
    outputCapture.start();

    // Run the analysis
    const result = await analyzeTransaction(signature);

    // Get captured logs
    const logs = outputCapture.stop();

    // Return the response
    res.json(createApiResponse(true, {
      signature,
      result,
      logs
    }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/blocks:
 *   post:
 *     summary: Analyze a block range for dusting attacks
 *     description: Analyzes Solana blocks within a range to detect potential dusting attacks
 *     tags:
 *       - Block Analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BlockRangeAnalysisRequest'
 *           example:
 *             startSlot: 150000000
 *             endSlot: 150000100
 *             maxTransactions: 100
 *     responses:
 *       200:
 *         description: Block range analysis results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
app.post('/v1/api/blocks', async (req, res) => {
  try {
    const { startSlot, endSlot, maxTransactions = 100 } = req.body;

    if (!startSlot || !endSlot) {
      return res.status(400).json(createApiResponse(false, null, 'Start and end slots are required'));
    }

    if (endSlot < startSlot) {
      return res.status(400).json(createApiResponse(false, null, 'End slot must be greater than or equal to start slot'));
    }

    // Capture console output
    const outputCapture = new OutputCapture();
    outputCapture.start();

    // Run the analysis
    const result = await analyzeBlockRange(startSlot, endSlot, maxTransactions);

    // Get captured logs
    const logs = outputCapture.stop();

    // Return the response
    res.json(createApiResponse(true, {
      startSlot,
      endSlot,
      maxTransactions,
      result,
      logs
    }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/token:
 *   post:
 *     summary: Analyze a token for dusting attacks
 *     description: Analyzes a Solana token to detect potential dusting attacks
 *     tags:
 *       - Token Analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TokenAnalysisRequest'
 *           example:
 *             tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 *             maxTransactions: 50
 *     responses:
 *       200:
 *         description: Token analysis results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
app.post('/v1/api/token', async (req, res) => {
  try {
    const { tokenMint, maxTransactions = 50 } = req.body;

    if (!tokenMint) {
      return res.status(400).json(createApiResponse(false, null, 'Token mint address is required'));
    }

    // Capture console output
    const outputCapture = new OutputCapture();
    outputCapture.start();

    // Run the analysis
    const result = await analyzeTokenMint(tokenMint, maxTransactions);

    // Get captured logs
    const logs = outputCapture.stop();

    // Return the response
    res.json(createApiResponse(true, {
      tokenMint,
      maxTransactions,
      result,
      logs
    }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/batch:
 *   post:
 *     summary: Analyze multiple wallets for dusting attacks
 *     description: Analyzes multiple Solana wallets to detect potential dusting attacks
 *     tags:
 *       - Batch Analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchAnalysisRequest'
 *           example:
 *             wallets: ["vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg", "HMBKn2hPdLLEadXxKxM2bfeqHeXxqtVMpB8e9yJDTc5z"]
 *             numTransactions: 10
 *     responses:
 *       200:
 *         description: Batch analysis results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
app.post('/v1/api/batch', async (req, res) => {
  try {
    const { wallets, numTransactions = 10 } = req.body;

    if (!wallets || !Array.isArray(wallets) || wallets.length === 0) {
      return res.status(400).json(createApiResponse(false, null, 'Array of wallet addresses is required'));
    }

    // Capture console output
    const outputCapture = new OutputCapture();
    outputCapture.start();

    // Run the analysis
    const result = await analyzeBatchWallets(wallets, numTransactions);

    // Get captured logs
    const logs = outputCapture.stop();

    // Return the response
    res.json(createApiResponse(true, {
      wallets,
      numTransactions,
      result,
      logs
    }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/time:
 *   post:
 *     summary: Analyze transactions within a time range
 *     description: Analyzes Solana transactions within a specific time range to detect potential dusting attacks
 *     tags:
 *       - Time-Based Analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimeRangeAnalysisRequest'
 *           example:
 *             walletAddress: "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg"
 *             startTime: "2022-01-01"
 *             endTime: "2022-12-31"
 *             maxTransactions: 50
 *     responses:
 *       200:
 *         description: Time range analysis results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
app.post('/v1/api/time', async (req, res) => {
  try {
    const { walletAddress, startTime, endTime, maxTransactions = 50 } = req.body;

    if (!walletAddress) {
      return res.status(400).json(createApiResponse(false, null, 'Wallet address is required'));
    }

    if (!startTime || !endTime) {
      return res.status(400).json(createApiResponse(false, null, 'Start and end times are required'));
    }

    // Capture console output
    const outputCapture = new OutputCapture();
    outputCapture.start();

    // Run the analysis
    const result = await analyzeTimeRange(walletAddress, startTime, endTime, maxTransactions);

    // Get captured logs
    const logs = outputCapture.stop();

    // Return the response
    res.json(createApiResponse(true, {
      walletAddress,
      startTime,
      endTime,
      maxTransactions,
      result,
      logs
    }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/wallet-tokens:
 *   post:
 *     summary: Analyze tokens in a wallet for suspicious indicators
 *     description: Analyzes tokens in a Solana wallet to detect suspicious indicators
 *     tags:
 *       - Wallet Analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WalletTokensAnalysisRequest'
 *           example:
 *             walletAddress: "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg"
 *     responses:
 *       200:
 *         description: Wallet tokens analysis results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
app.post('/v1/api/wallet-tokens', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json(createApiResponse(false, null, 'Wallet address is required'));
    }

    // Capture console output
    const outputCapture = new OutputCapture();
    outputCapture.start();

    // Run the analysis
    const result = await analyzeWalletTokens(walletAddress);

    // Get captured logs
    const logs = outputCapture.stop();

    // Return the response
    res.json(createApiResponse(true, {
      walletAddress,
      result,
      logs
    }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/memo:
 *   post:
 *     summary: Analyze transaction memos for suspicious content
 *     description: Analyzes memos in a Solana transaction to detect potential scams and phishing attempts
 *     tags:
 *       - Memo Analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MemoAnalysisRequest'
 *           example:
 *             signature: "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf"
 *     responses:
 *       200:
 *         description: Memo analysis results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
app.post('/v1/api/memo', async (req, res) => {
  try {
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json(createApiResponse(false, null, 'Transaction signature is required'));
    }

    // Capture console output
    const outputCapture = new OutputCapture();
    outputCapture.start();

    // Run the analysis
    const result = await analyzeMemo(signature);

    // Get captured logs
    const logs = outputCapture.stop();

    // Return the response
    res.json(createApiResponse(true, {
      signature,
      result,
      logs
    }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

/**
 * @swagger
 * /v1/api/memo-batch:
 *   post:
 *     summary: Analyze multiple memo texts for suspicious content
 *     description: Analyzes a batch of memo texts to detect potential scams and phishing attempts
 *     tags:
 *       - Memo Analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MemoBatchAnalysisRequest'
 *           example:
 *             memos: [
 *               "Claim your free airdrop at example.com",
 *               "Congratulations! You won 1000 SOL, visit claim-rewards.xyz"
 *             ]
 *     responses:
 *       200:
 *         description: Batch memo analysis results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request parameters
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
app.post('/v1/api/memo-batch', async (req, res) => {
  try {
    const { memos } = req.body;

    if (!memos || !Array.isArray(memos) || memos.length === 0) {
      return res.status(400).json(createApiResponse(false, null, 'Array of memo texts is required'));
    }

    // Capture console output
    const outputCapture = new OutputCapture();
    outputCapture.start();

    // Run the analysis
    const result = await analyzeMemoList(memos);

    // Get captured logs
    const logs = outputCapture.stop();

    // Return the response
    res.json(createApiResponse(true, {
      memoCount: memos.length,
      result,
      logs
    }));
  } catch (error) {
    res.status(500).json(createApiResponse(false, null, error.message));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json(createApiResponse(false, null, 'Internal server error'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Solana Spam Detector API server running on port ${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
});
