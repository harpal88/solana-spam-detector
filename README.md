# Solana Spam Detector API

A RESTful API for detecting spam and dusting attacks on the Solana blockchain.

## Features

- **Wallet Analysis**: Analyze a wallet address for potential dusting attacks
- **Transaction Analysis**: Analyze a specific transaction for dusting attack indicators
- **Block Range Analysis**: Analyze transactions within a specific block range
- **Token Analysis**: Analyze transactions involving a specific token mint address
- **Batch Wallet Analysis**: Analyze multiple wallet addresses in a single request
- **Time-Based Analysis**: Analyze transactions within a specific time range
- **Wallet Tokens Analysis**: Analyze tokens in a wallet for suspicious indicators
- **Memo Analysis**: Analyze transaction memos for suspicious content
- **Memo Batch Analysis**: Analyze multiple memo texts for suspicious content

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Helius API key (for Solana blockchain data)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/solana-spam-detector.git
   cd solana-spam-detector
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `config.js` file with your Helius API key:
   ```javascript
   module.exports = {
     HELIUS_API_KEY: 'your-helius-api-key'
   };
   ```

## Usage

### Starting the API Server

```
npm start
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

### API Documentation

Once the server is running, you can access the Swagger API documentation at:

```
http://localhost:3000/api-docs
```

For detailed API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

### Example API Requests

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

#### Memo Analysis

```bash
curl -X POST http://localhost:3000/v1/api/memo \
  -H "Content-Type: application/json" \
  -d '{"signature": "4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf"}'
```

## Development

For development with auto-restart on file changes:

```
npm run dev
```

## Security Considerations

- The API implements rate limiting to prevent abuse
- Consider adding authentication for production use
- Keep your Helius API key secure

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Helius](https://helius.xyz/) for providing Solana blockchain data
- [Express](https://expressjs.com/) for the web framework
- [Swagger](https://swagger.io/) for API documentation
