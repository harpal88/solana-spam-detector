# Solana Spam Detector CLI Commands

This document provides a list of all available CLI commands for the Solana Spam Detector tool with examples.

## Available Commands

The CLI tool can be used with the following syntax:

```
node index.js <command> [arguments]
```

You can also get help by running:

```
node index.js help
```

### Wallet Analysis

Analyze a wallet address for dusting attacks.

```
node index.js wallet <wallet-address> <num-transactions>
```

**Example:**
```
node index.js wallet vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg 20
```

### Transaction Analysis

Analyze a specific transaction for dusting attacks.

```
node index.js tx <transaction-signature>
```

**Example:**
```
node index.js tx 5YARGvp3ufVm9Svh2ZQxEySSdrQUhY3YLLAXTTHxJvhw
```

### Block Range Analysis

Analyze a range of blocks for dusting attacks.

```
node index.js blocks <start-block> <end-block>
```

**Example:**
```
node index.js blocks 150000000 150000010
```

### Token Analysis

Analyze a token mint address for dusting attacks.

```
node index.js token <token-mint-address> <max-transactions>
```

**Example:**
```
node index.js token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 50
```

### Wallet Token Analysis

Analyze all tokens in a wallet for suspicious indicators.

```
node index.js tokens <wallet-address> [num-transactions]
```

The `num-transactions` parameter is optional:
- If omitted, only tokens in the wallet will be analyzed (no transaction analysis)
- If provided, will also analyze that many recent transactions for token transfers

**Example (tokens only):**
```
node index.js tokens vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg
```

**Example (with transaction analysis):**
```
node index.js tokens vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg 20
```

### Batch Wallet Analysis

Analyze multiple wallet addresses from a file or a comma-separated list.

```
node index.js batch <file-path | addresses> <num-transactions>
```

**Example with file:**
```
node index.js batch ./data/wallets.txt 10
```

**Example with comma-separated list:**
```
node index.js batch vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg,9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM 10
```

### Time-Based Analysis

Analyze transactions within a specific time range.

```
node index.js time <wallet-address> <start-time> <end-time>
```

**Example (using timestamps):**
```
node index.js time vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg 1640995200000 1641081600000
```

**Example (using date strings):**
```
node index.js time vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg "2022-01-01" "2022-01-02"
```

### Memo Analysis

Analyze a transaction memo or a file containing memos for scam indicators.

```
node index.js memo <memo-text | file-path>
```

**Example with text:**
```
node index.js memo "Claim your free airdrop at https://scam-site.com"
```

**Example with file:**
```
node index.js memo ./data/memos.txt
```

## Example Transactions for Testing

Here are some example transaction signatures that can be used for testing:

1. **Regular SOL Transfer:**
   ```
   4oBFNe4qjAYPH6q5cK8C5MwPvC8jbTw2SXZsekwQE8gJPQvTRsQDj4mZQNmqT3MYaJNgDh3yJuF3GZFMmJgKFZWP
   ```

2. **Token Transfer (USDC):**
   ```
   4XE9mafpH8AiTdMJXGpVQbee86HUdenbr63dDgJkKKnRZJQKCW9LPKCUNnvBdLvmLcCJvPQAHWP5DmwBLwGDSLNq
   ```

3. **NFT Transfer:**
   ```
   5YARGvp3ufVm9Svh2ZQxEySSdrQUhY3YLLAXTTHxJvhw
   ```

4. **Potential Dusting Attack:**
   ```
   3vDU6xomZBZFCWkGKAyGVS8K4S4qZZzDDbCNyLxDrUPBzRjYzYGY4ZnmLNECVSK8gYCsY1MoFa7iFPXxXn4WQtBF
   ```

5. **Transaction with Memo:**
   ```
   2Hh35XeZkZEWzpzNZyVYJDgCJGCTPKyLQzF4Yiafs4vJ4BkYKJfvPQhsk9ZyQBtCKML9iJKVGHAsJT1yDDP1RzXH
   ```

## Creating a Wallet List File for Batch Analysis

To use the batch analysis command, create a text file with one wallet address per line:

```
vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg
9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH
2qMqGzk6UPYZoq8ffgDskAQPF8Pjo9hDL3o5Y7WxkmRo
```

Save this file as `wallets.txt` in the `data` directory.
