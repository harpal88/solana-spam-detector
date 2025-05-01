# Solana Spam Detector

API for detecting spam and dusting attacks on the Solana blockchain.

## Project Structure

```
solana-spam-detector/
├── config/                  # Configuration files
│   ├── config.js            # Main configuration
│   └── config.example.js    # Example configuration
├── data/                    # Data storage
│   ├── example-transactions.json  # Example transactions for testing
│   └── wallets.txt          # Sample wallet list for batch analysis
├── docs/                    # Documentation
│   ├── API_DOCUMENTATION.md # API documentation
│   ├── CLI_COMMANDS.md      # CLI commands documentation
│   └── README.md            # Original README
├── public/                  # Frontend assets
│   └── dashboard/           # Dashboard frontend
│       ├── assets/          # Images, icons, etc.
│       ├── components/      # Reusable UI components
│       ├── css/             # Stylesheets
│       │   └── styles.css   # Main stylesheet
│       ├── js/              # JavaScript files
│       │   └── dashboard.js # Main dashboard script
│       └── index.html       # Dashboard HTML
├── src/                     # Source code
│   ├── analyzers/           # Analysis modules
│   │   ├── batch-analyzer.js    # Batch wallet analysis
│   │   ├── block-analyzer.js    # Block range analysis
│   │   ├── memo-analyzer.js     # Memo analysis
│   │   ├── time-analyzer.js     # Time-based analysis
│   │   ├── token-analyzer.js    # Token analysis
│   │   ├── transaction-analyzer.js # Transaction analysis
│   │   └── wallet-analyzer.js   # Wallet analysis
│   ├── api/                 # API endpoints
│   │   ├── api-helpers.js   # API helper functions
│   │   ├── api-server.js    # Main API server
│   │   └── dashboard-api.js # Dashboard API endpoints
│   ├── dashboard/           # Dashboard backend
│   │   └── dashboard-data-collector.js # Data collection for dashboard
│   └── utils/               # Utility functions
│       ├── get-token-price.js    # Token price fetching
│       ├── token-price-fetcher.js # Token price fetching utilities
│       └── token-whitelist.js    # Token whitelist
├── examples.js              # Example script for testing
├── index.js                 # CLI entry point
└── server.js                # API server entry point
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/harpal88/solana-spam-detector.git
cd solana-spam-detector
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables:
```bash
cp .env.example .env
```

4. Edit the `.env` file with your Helius API key:
```
VITE_HELIUS_API_KEY=your-helius-api-key-here
```

5. For deployment to Render, add the environment variable:
   - Key: `VITE_HELIUS_API_KEY`
   - Value: Your Helius API key

## Usage

### CLI Commands

The Solana Spam Detector can be used as a command-line tool with various commands:

```bash
node index.js wallet vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg 20
```

For a complete list of CLI commands and examples, see [CLI Commands Documentation](docs/CLI_COMMANDS.md).

### Example Transactions

You can run example transactions using the examples.js script:

```bash
node examples.js tx     # Run transaction examples
node examples.js wallet # Run wallet examples
node examples.js token  # Run token examples
node examples.js all    # Run one example of each type
```

### Starting the API Server

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

### Accessing the Dashboard

Open your browser and navigate to:
```
http://localhost:3000
```

The dashboard is also available at:
```
http://localhost:3000/dashboard
```

### API Documentation

API documentation is available at:
```
http://localhost:3000/api-docs
```

## Features

- Wallet address analysis for dusting attacks
- Transaction signature analysis
- Block range scanning
- Token mint address analysis
- Batch wallet analysis
- Time-based analysis
- Memo analysis for scam detection
- Interactive dashboard for visualization

## License

MIT
