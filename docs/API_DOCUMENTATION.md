# Solana Spam Detector API Documentation

This document provides detailed information about the Solana Spam Detector API endpoints, request/response formats, and usage examples.

## Table of Contents

1. [Introduction](#introduction)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Rate Limiting](#rate-limiting)
5. [Response Format](#response-format)
6. [API Endpoints](#api-endpoints)
   - [Health Check](#health-check)
   - [Wallet Analysis](#wallet-analysis)
   - [Transaction Analysis](#transaction-analysis)
   - [Block Range Analysis](#block-range-analysis)
   - [Token Analysis](#token-analysis)
   - [Batch Wallet Analysis](#batch-wallet-analysis)
   - [Time-Based Analysis](#time-based-analysis)
   - [Wallet Tokens Analysis](#wallet-tokens-analysis)
   - [Memo Analysis](#memo-analysis)
   - [Memo Text Analysis](#memo-text-analysis)
   - [Memo Batch Analysis](#memo-batch-analysis)
   - [Dashboard](#dashboard)
7. [Error Handling](#error-handling)
8. [Security Considerations](#security-considerations)
9. [Examples](#examples)

## Introduction

The Solana Spam Detector API provides endpoints for detecting spam and dusting attacks on the Solana blockchain. It analyzes wallets, transactions, blocks, tokens, and memos to identify potential malicious activity.

## Base URL

```
http://localhost:3000/v1/api
```

For production, replace with your actual domain.

## Authentication

Currently, the API does not require authentication. However, rate limiting is applied to prevent abuse.

## Rate Limiting

The API implements rate limiting to prevent abuse:

- 100 requests per 15-minute window per IP address
- When the limit is exceeded, the API will return a 429 status code with a message indicating when you can retry

## Response Format

All API responses follow a standard format:

```json
{
  "success": true|false,
  "timestamp": "ISO-8601 timestamp",
  "data": { ... },  // Present on successful requests
  "error": "Error message"  // Present on failed requests
}
```

## API Endpoints

### Health Check

Check if the API is running properly.

**Endpoint:** `GET /v1/api/health`

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "status": "healthy",
    "version": "1.0.0"
  }
}
```

### Wallet Analysis

Analyze a wallet address for potential dusting attacks.

**Endpoint:** `POST /v1/api/wallet`

**Request Body:**

```json
{
  "walletAddress": "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
  "numTransactions": 10  // Optional, default: 10
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "walletAddress": "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
    "numTransactions": 10,
    "result": {
      // Analysis results
    },
    "logs": [
      // Console output from the analysis
    ]
  }
}
```

### Transaction Analysis

Analyze a specific transaction for dusting attack indicators.

**Endpoint:** `POST /v1/api/transaction`

**Request Body:**

```json
{
  "signature": "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf"
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "signature": "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf",
    "result": {
      "signature": "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf",
      "timestamp": 1640995200,
      "type": "TRANSFER",
      "description": "Transaction description",
      "isDusting": true|false,
      "dustingIndicators": [
        // Indicators of dusting attack
      ],
      "primaryAttackVector": "SOL_DUST|TOKEN_DUST|MEMO_SCAM|MIXED_DUST",
      "riskScore": 75,
      "riskLevel": "LOW|MEDIUM|HIGH|VERY HIGH"
    },
    "logs": [
      // Console output from the analysis
    ]
  }
}
```

### Block Range Analysis

Analyze transactions within a specific block range.

**Endpoint:** `POST /v1/api/blocks`

**Request Body:**

```json
{
  "startSlot": 150000000,
  "endSlot": 150000100,
  "maxTransactions": 100  // Optional, default: 100
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "startSlot": 150000000,
    "endSlot": 150000100,
    "maxTransactions": 100,
    "result": {
      // Analysis results
    },
    "logs": [
      // Console output from the analysis
    ]
  }
}
```

### Token Analysis

Analyze transactions involving a specific token mint address.

**Endpoint:** `POST /v1/api/token`

**Request Body:**

```json
{
  "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "maxTransactions": 50  // Optional, default: 50
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "maxTransactions": 50,
    "result": {
      // Analysis results
    },
    "logs": [
      // Console output from the analysis
    ]
  }
}
```

### Batch Wallet Analysis

Analyze multiple wallet addresses in a single request.

**Endpoint:** `POST /v1/api/batch`

**Request Body:**

```json
{
  "wallets": [
    "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
    "HMBKn2hPdLLEadXxKxM2bfeqHeXxqtVMpB8e9yJDTc5z"
  ],
  "numTransactions": 10  // Optional, default: 10
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "wallets": [
      "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
      "HMBKn2hPdLLEadXxKxM2bfeqHeXxqtVMpB8e9yJDTc5z"
    ],
    "numTransactions": 10,
    "result": {
      // Analysis results
    },
    "logs": [
      // Console output from the analysis
    ]
  }
}
```

### Time-Based Analysis

Analyze transactions within a specific time range.

**Endpoint:** `POST /v1/api/time`

**Request Body:**

```json
{
  "walletAddress": "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
  "startTime": "2022-01-01",  // Can be Unix timestamp or date string
  "endTime": "2022-12-31",    // Can be Unix timestamp or date string
  "maxTransactions": 50       // Optional, default: 50
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "walletAddress": "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
    "startTime": "2022-01-01",
    "endTime": "2022-12-31",
    "maxTransactions": 50,
    "result": {
      // Analysis results
    },
    "logs": [
      // Console output from the analysis
    ]
  }
}
```

### Wallet Tokens Analysis

Analyze tokens in a wallet for suspicious indicators and potential dusting attacks.

**Endpoint:** `POST /v1/api/wallet-tokens`

**Request Body:**

```json
{
  "walletAddress": "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
  "numTransactions": 0
}
```

The `numTransactions` parameter is optional:
- If omitted or set to 0, only tokens in the wallet will be analyzed (no transaction analysis)
- If provided with a value > 0, will also analyze that many recent transactions for token transfers

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "walletAddress": "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
    "numTransactions": 0,
    "tokenInfo": {
      "summary": {
        "totalTokens": 6,
        "suspiciousTokens": 1,
        "totalValue": 0,
        "suspiciousValue": 0,
        "riskPercentage": 0
      },
      "tokens": [
        {
          "name": "Unknown",
          "symbol": "Unknown",
          "mint": "HyU5k4ZKMkLNnbuZDAGvwxTXbxubAcdJNYcotAre2fBL",
          "amount": 1,
          "decimals": 0,
          "isSuspicious": true,
          "suspiciousReasons": ["Minimal token amount (≤1)"]
        },
        {
          "name": "Unknown",
          "symbol": "Unknown",
          "mint": "C4TJbSnUyhdKhAV2emVPMbFfazHRSXvY2sQvk3sh4XjE",
          "amount": 16,
          "decimals": 0,
          "isSuspicious": false,
          "suspiciousReasons": []
        }
      ]
    },
    "logs": [
      // Console output from the analysis
    ]
  }
}
```

### Memo Analysis

Analyze memos in a transaction for suspicious content like scam links or promotional messages.

**Endpoint:** `POST /v1/api/memo`

**Request Body:**

```json
{
  "signature": "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf"
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "signature": "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf",
    "result": {
      "memoCount": 1,
      "memos": [
        {
          "memoText": "Claim your free airdrop at example.com",
          "isSuspicious": true,
          "suspiciousScore": 4,
          "foundTerms": ["airdrop", "free", "claim"],
          "containsUrl": true,
          "urls": ["example.com"],
          "reason": "Suspicious memo containing URL with suspicious terms: airdrop, free, claim"
        }
      ],
      "hasSuspiciousMemo": true,
      "overallRiskScore": 4,
      "overallRiskLevel": "MEDIUM"
    },
    "logs": [
      // Console output from the analysis
    ]
  }
}
```

### Memo Text Analysis

Analyze a memo text directly for suspicious content.

**Endpoint:** `POST /v1/api/memo-text`

**Request Body:**

```json
{
  "memoText": "Claim your free airdrop at example.com"
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "memoText": "Claim your free airdrop at example.com",
    "result": {
      "isSuspicious": true,
      "suspiciousScore": 4,
      "foundTerms": ["airdrop", "free", "claim"],
      "containsUrl": true,
      "urls": ["example.com"],
      "reason": "Suspicious memo containing URL with suspicious terms: airdrop, free, claim"
    },
    "logs": [
      // Console output from the analysis
    ]
  }
}
```

### Memo Batch Analysis

Analyze multiple memo texts for suspicious content.

**Endpoint:** `POST /v1/api/memo-batch`

**Request Body:**

```json
{
  "memos": [
    "Claim your free airdrop at example.com",
    "Congratulations! You won 1000 SOL, visit claim-rewards.xyz"
  ]
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "memoCount": 2,
    "result": {
      "memos": [
        {
          "memoText": "Claim your free airdrop at example.com",
          "isSuspicious": true,
          "suspiciousScore": 4,
          "foundTerms": ["airdrop", "free", "claim"],
          "containsUrl": true,
          "urls": ["example.com"],
          "reason": "Suspicious memo containing URL with suspicious terms: airdrop, free, claim"
        },
        {
          "memoText": "Congratulations! You won 1000 SOL, visit claim-rewards.xyz",
          "isSuspicious": true,
          "suspiciousScore": 5,
          "foundTerms": ["won", "claim"],
          "containsUrl": true,
          "urls": ["claim-rewards.xyz"],
          "reason": "Suspicious memo containing URL with suspicious terms: won, claim"
        }
      ],
      "hasSuspiciousMemo": true,
      "overallRiskScore": 9,
      "overallRiskLevel": "HIGH"
    },
    "logs": [
      // Console output from the analysis
    ]
  }
}
```

## Error Handling

The API returns appropriate HTTP status codes along with error messages:

- `400 Bad Request`: Invalid request parameters
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

Error response example:

```json
{
  "success": false,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "error": "Wallet address is required"
}
```

## Security Considerations

### Rate Limiting

The API implements rate limiting to prevent abuse and ensure fair usage:

- 100 requests per 15-minute window per IP address
- When the limit is exceeded, the API returns a 429 status code with a message indicating when you can retry

### Input Validation

All API endpoints implement strict input validation to prevent injection attacks:

- Wallet addresses are validated for correct format
- Transaction signatures are validated for correct format
- Numeric parameters are validated for reasonable ranges
- Array inputs are validated for maximum size

### Data Privacy

The API does not store any user data or transaction information:

- All analysis is performed in real-time
- No logs of user queries are maintained beyond the current session
- No personally identifiable information is collected

### API Security Best Practices

When using this API in production, consider implementing these additional security measures:

1. Use HTTPS for all API requests
2. Implement proper authentication if exposing the API publicly
3. Set up monitoring for unusual API usage patterns
4. Regularly update dependencies to patch security vulnerabilities

## Examples

### cURL Examples

#### Wallet Analysis

```bash
curl -X POST http://localhost:3000/v1/api/wallet \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg", "numTransactions": 20}'
```

#### Transaction Analysis

```bash
curl -X POST http://localhost:3000/v1/api/transaction \
  -H "Content-Type: application/json" \
  -d '{"signature": "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf"}'
```

#### Time-Based Analysis

```bash
curl -X POST http://localhost:3000/v1/api/time \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg", "startTime": "2022-01-01", "endTime": "2022-12-31", "maxTransactions": 50}'
```

#### Wallet Tokens Analysis

```bash
curl -X POST http://localhost:3000/v1/api/wallet-tokens \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg", "numTransactions": 0}'
```

#### Memo Analysis

```bash
curl -X POST http://localhost:3000/v1/api/memo \
  -H "Content-Type: application/json" \
  -d '{"signature": "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf"}'
```

#### Memo Text Analysis

```bash
curl -X POST http://localhost:3000/v1/api/memo-text \
  -H "Content-Type: application/json" \
  -d '{"memoText": "Claim your free airdrop at example.com"}'
```

#### Memo Batch Analysis

```bash
curl -X POST http://localhost:3000/v1/api/memo-batch \
  -H "Content-Type: application/json" \
  -d '{"memos": ["Claim your free airdrop at example.com", "Congratulations! You won 1000 SOL, visit claim-rewards.xyz"]}'
```

### Dashboard

The dashboard provides visualization of spam and dusting attack patterns and trends.

#### Dashboard Web Interface

Access the dashboard web interface at:

```
http://localhost:3000
```

The dashboard is also available at:

```
http://localhost:3000/dashboard
```

#### Dashboard API Endpoints

##### Get Dashboard Statistics

**Endpoint:** `GET /v1/api/dashboard/stats`

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "tokens": {
      "totalTokensAnalyzed": 10,
      "suspiciousTokensCount": 3,
      "suspiciousTokenPercentage": 30.0,
      "riskLevelDistribution": {
        "high": 1,
        "medium": 1,
        "low": 1,
        "none": 7
      }
    },
    "transactions": {
      "totalTransactionsAnalyzed": 50,
      "dustingTransactionsCount": 12,
      "dustingTransactionPercentage": 24.0,
      "attackVectorDistribution": {
        "SOL_DUST": 5,
        "TOKEN_DUST": 6,
        "MIXED_DUST": 1,
        "OTHER": 0
      }
    },
    "wallets": {
      "totalWalletsAnalyzed": 15,
      "victimWalletsCount": 8,
      "victimWalletPercentage": 53.3,
      "attackerWalletsCount": 2,
      "attackerWalletPercentage": 13.3
    },
    "lastUpdated": "2023-05-15T12:34:56.789Z"
  }
}
```

##### Get Time Series Data

**Endpoint:** `GET /v1/api/dashboard/time-series`

**Query Parameters:**
- `dataType` (required): Type of data to retrieve (tokens, transactions, wallets)
- `timeframe` (optional): Timeframe for grouping data (day, week, month). Default: day

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "labels": ["2023-05-01", "2023-05-02", "2023-05-03"],
    "datasets": [
      {
        "label": "Suspicious Tokens",
        "data": [1, 2, 0],
        "backgroundColor": "rgba(255, 99, 132, 0.5)",
        "borderColor": "rgb(255, 99, 132)",
        "borderWidth": 1
      },
      {
        "label": "Total Tokens Analyzed",
        "data": [3, 4, 3],
        "backgroundColor": "rgba(54, 162, 235, 0.5)",
        "borderColor": "rgb(54, 162, 235)",
        "borderWidth": 1
      }
    ]
  }
}
```

##### Collect Token Analysis Data

**Endpoint:** `POST /v1/api/dashboard/collect/token`

**Request Body:**

```json
{
  "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "maxTransactions": 50
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "message": "Token analysis data collected",
    "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  }
}
```

##### Collect Transaction Analysis Data

**Endpoint:** `POST /v1/api/dashboard/collect/transaction`

**Request Body:**

```json
{
  "signature": "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf"
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "message": "Transaction analysis data collected",
    "signature": "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf"
  }
}
```

##### Collect Wallet Analysis Data

**Endpoint:** `POST /v1/api/dashboard/collect/wallet`

**Request Body:**

```json
{
  "walletAddress": "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
  "numTransactions": 10
}
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2023-05-15T12:34:56.789Z",
  "data": {
    "message": "Wallet analysis data collected",
    "walletAddress": "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg"
  }
}
```

### JavaScript Examples

#### Wallet Analysis

```javascript
fetch('http://localhost:3000/v1/api/wallet', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    walletAddress: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg',
    numTransactions: 20
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

#### Transaction Analysis

```javascript
fetch('http://localhost:3000/v1/api/transaction', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    signature: '4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

#### Wallet Tokens Analysis

```javascript
fetch('http://localhost:3000/v1/api/wallet-tokens', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    walletAddress: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg',
    numTransactions: 0
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

#### Memo Analysis

```javascript
fetch('http://localhost:3000/v1/api/memo', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    signature: '4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

#### Memo Text Analysis

```javascript
fetch('http://localhost:3000/v1/api/memo-text', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    memoText: 'Claim your free airdrop at example.com'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```
