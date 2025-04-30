/**
 * Solana Dusting Attack Detector
 *
 * This script analyzes a Solana wallet address to detect potential dusting attacks.
 * It uses the Helius API to fetch and analyze transaction data.
 *
 * Usage:
 * node dusting-detector.js <wallet-address> <num-transactions>
 */

// Try to load config file, use placeholder if not found
let HELIUS_API_KEY = '';

import { HELIUS_API_KEY } from './config';

const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_API_URL = `https://api.helius.xyz/v0`;
const SOLANA_PUBLIC_RPC = 'https://api.mainnet-beta.solana.com';
const SOLANA_EXPLORER_API = 'https://explorer-api.mainnet-beta.solana.com';

// Helper function to make JSON-RPC requests to Helius
async function makeRpcRequest(method, params = []) {
  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making RPC request to ${method}:`, error);
    return null;
  }
}

// Helper function to make JSON-RPC requests to public Solana RPC
async function makePublicRpcRequest(method, params = []) {
  try {
    const response = await fetch(SOLANA_PUBLIC_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making public RPC request to ${method}:`, error);
    return null;
  }
}

// Helper function to make API requests to Helius
async function makeApiRequest(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const url = `${HELIUS_API_URL}${endpoint}?api-key=${HELIUS_API_KEY}`;
    const response = await fetch(url, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making API request to ${endpoint}:`, error);
    return null;
  }
}

// Helper function to make requests to Solana Explorer API
async function makeExplorerRequest(endpoint, params = {}) {
  try {
    // Convert params to query string
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      queryParams.append(key, value);
    }

    const url = `${SOLANA_EXPLORER_API}${endpoint}?${queryParams.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making Explorer API request to ${endpoint}:`, error);
    return null;
  }
}

// Get transaction signatures for an address
async function getTransactionSignatures(address, limit = 10) {
  try {
    const response = await makeRpcRequest('getSignaturesForAddress', [
      address,
      { limit }
    ]);

    if (response && response.result) {
      return response.result.map(item => item.signature);
    }

    return [];
  } catch (error) {
    console.error('Error fetching transaction signatures:', error);
    return [];
  }
}

// Analyze a transaction for dusting attacks
async function analyzeTransaction(signature) {
  // Try Helius API first
  let parseResponse = await makeApiRequest('/transactions', 'POST', {
    transactions: [signature],
  });

  // If Helius fails, try public RPC
  if (!parseResponse || !parseResponse[0]) {
    console.log(`Helius API couldn't parse transaction ${signature.substring(0, 8)}... Trying public RPC...`);

    try {
      // Get transaction from public RPC
      const txResponse = await makePublicRpcRequest('getTransaction', [
        signature,
        { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }
      ]);

      if (txResponse && txResponse.result) {
        // Convert the public RPC format to something similar to Helius format
        const tx = txResponse.result;

        // Create a simplified transaction object
        const simplifiedTx = {
          signature: signature,
          timestamp: tx.blockTime || Math.floor(Date.now() / 1000),
          type: 'UNKNOWN', // We don't have type info from public RPC
          description: 'Transaction details from public RPC',
          nativeTransfers: [],
          tokenTransfers: []
        };

        // Extract native transfers if available
        if (tx.meta && tx.meta.preBalances && tx.meta.postBalances && tx.transaction.message.accountKeys) {
          const accountKeys = tx.transaction.message.accountKeys;

          for (let i = 0; i < accountKeys.length; i++) {
            const preBalance = tx.meta.preBalances[i];
            const postBalance = tx.meta.postBalances[i];
            const balanceDiff = postBalance - preBalance;

            if (balanceDiff !== 0) {
              // This is a simplification - in reality we'd need to analyze the transaction more carefully
              // to determine actual transfers, but this gives us something to work with
              if (balanceDiff > 0) {
                simplifiedTx.nativeTransfers.push({
                  fromUserAccount: 'Unknown', // We don't know the sender
                  toUserAccount: accountKeys[i],
                  amount: balanceDiff // This is in lamports
                });
              }
            }
          }
        }

        // Extract token transfers if available
        if (tx.meta && tx.meta.postTokenBalances && tx.meta.preTokenBalances) {
          const preBalances = tx.meta.preTokenBalances || [];
          const postBalances = tx.meta.postTokenBalances || [];

          // Create a map of pre-balances
          const preBalanceMap = {};
          for (const balance of preBalances) {
            const key = `${balance.accountIndex}-${balance.mint}`;
            preBalanceMap[key] = balance.uiTokenAmount.uiAmount || 0;
          }

          // Check post-balances against pre-balances to find transfers
          for (const balance of postBalances) {
            const key = `${balance.accountIndex}-${balance.mint}`;
            const postAmount = balance.uiTokenAmount.uiAmount || 0;
            const preAmount = preBalanceMap[key] || 0;
            const diff = postAmount - preAmount;

            if (diff > 0) {
              simplifiedTx.tokenTransfers.push({
                fromUserAccount: 'Unknown', // We don't know the sender
                toUserAccount: tx.transaction.message.accountKeys[balance.accountIndex],
                tokenAmount: diff.toString(),
                mint: balance.mint
              });
            }
          }
        }

        parseResponse = [simplifiedTx];
      }
    } catch (error) {
      console.error('Error fetching transaction from public RPC:', error);
    }
  }

  // If we still don't have transaction data, return error
  if (!parseResponse || !parseResponse[0]) {
    return {
      isDusting: false,
      details: 'Error parsing transaction or transaction not found'
    };
  }

  const tx = parseResponse[0];
  const dustingIndicators = [];
  let isDusting = false;

  // Skip BURN transactions - they're not dusting attacks
  if (tx.type === 'BURN') {
    return {
      signature,
      timestamp: tx.timestamp,
      type: tx.type,
      description: tx.description,
      isDusting: false
    };
  }

  // Check for native transfers (SOL)
  if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
    tx.nativeTransfers.forEach(transfer => {
      const solAmount = transfer.amount / 1000000000; // Convert lamports to SOL
      if (solAmount < 0.001) {
        isDusting = true;
        dustingIndicators.push({
          type: 'native',
          from: transfer.fromUserAccount || 'Unknown',
          to: transfer.toUserAccount || 'Unknown',
          amount: solAmount,
          reason: `Very small SOL transfer (${solAmount} SOL)`
        });
      }
    });
  }

  // Check for token transfers
  if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
    // Limit the number of token transfers we analyze to prevent overwhelming output
    const maxTransfersToShow = 5;
    const transfers = tx.tokenTransfers.slice(0, maxTransfersToShow);

    transfers.forEach(transfer => {
      if (parseFloat(transfer.tokenAmount) <= 1) {
        // Skip NFT transfers with amount 1 - these are likely legitimate NFT transfers, not dusting
        const isLikelyNFT = transfer.tokenAmount === "1" && tx.description &&
                           (tx.description.includes("NFT") ||
                            tx.description.includes("Collectible") ||
                            tx.description.toLowerCase().includes("transferred 1 "));

        if (!isLikelyNFT) {
          isDusting = true;
          dustingIndicators.push({
            type: 'token',
            from: transfer.fromUserAccount || 'Unknown',
            to: transfer.toUserAccount || 'Unknown',
            token: transfer.mint,
            amount: transfer.tokenAmount,
            reason: `Minimal token amount (${transfer.tokenAmount})`
          });
        }
      }
    });

    // If there are more transfers than we're showing, add a note
    if (tx.tokenTransfers.length > maxTransfersToShow) {
      const additionalCount = tx.tokenTransfers.length - maxTransfersToShow;
      dustingIndicators.push({
        type: 'info',
        reason: `... and ${additionalCount} more similar token transfers (not shown for brevity)`
      });
    }
  }

  // Check for memos (often contain scam links or promotional messages)
  if (tx.instructions) {
    for (const instruction of tx.instructions) {
      // Check if this is a memo instruction
      if (instruction.programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' ||
          instruction.programId === 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo') {

        // Extract the memo text
        let memoText = '';
        if (instruction.data) {
          try {
            // Attempt to decode the base58 data
            memoText = Buffer.from(instruction.data, 'base64').toString('utf8');
          } catch (e) {
            // If decoding fails, use the raw data
            memoText = instruction.data;
          }
        }

        if (memoText) {
          // Check for suspicious content in the memo
          const suspiciousTerms = [
            'airdrop', 'claim', 'free', 'winner', 'reward', 'bonus', 'giveaway',
            'limited', 'exclusive', 'congratulations', 'selected', 'promo', 'promotion',
            'offer', 'discount', 'special', 'gift', 'prize', 'won', 'earn', 'profit',
            'investment', 'crypto', 'token', 'nft', 'mint', 'whitelist'
          ];

          // Check for URLs in the memo
          const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|io|org|net|xyz|app))/gi;
          const containsUrl = urlRegex.test(memoText);

          // Check for suspicious terms
          const lowerMemo = memoText.toLowerCase();
          const foundTerms = suspiciousTerms.filter(term => lowerMemo.includes(term));

          // Score the memo based on suspicious indicators
          let suspiciousScore = 0;
          if (containsUrl) suspiciousScore += 3; // URLs are highly suspicious
          suspiciousScore += foundTerms.length; // Each suspicious term adds to the score

          // If the memo is suspicious, add it as an indicator
          if (suspiciousScore > 0 || containsUrl) {
            isDusting = true;

            let reason = 'Suspicious memo';
            if (containsUrl) reason += ' containing URL';
            if (foundTerms.length > 0) {
              reason += ` with suspicious terms: ${foundTerms.join(', ')}`;
            }

            dustingIndicators.push({
              type: 'memo',
              content: memoText,
              suspiciousScore,
              reason
            });
          }
        }
      }
    }
  }

  return {
    signature,
    timestamp: tx.timestamp,
    type: tx.type,
    description: tx.description,
    isDusting,
    dustingIndicators
  };
}

// Analyze wallet tokens for dusting
async function analyzeWalletTokens(walletAddress) {
  try {
    const tokensResponse = await makeApiRequest(`/addresses/${walletAddress}/tokens`);

    if (!tokensResponse) {
      return {
        suspiciousTokens: [],
        details: 'Error retrieving token data'
      };
    }

    // Handle different possible response formats
    let tokens = [];
    if (tokensResponse.tokens && Array.isArray(tokensResponse.tokens)) {
      tokens = tokensResponse.tokens;
    } else if (Array.isArray(tokensResponse)) {
      tokens = tokensResponse;
    }

    const suspiciousTokens = [];

    for (const token of tokens) {
      const suspiciousReasons = [];

      // Check for very small token amounts (potential dusting)
      if (token.amount && parseFloat(token.amount) <= 1) {
        suspiciousReasons.push('Minimal token amount (≤1)');
      }

      // Check token metadata for suspicious indicators
      if (token.name) {
        // Check for suspicious words in token name
        const suspiciousNameTerms = ['airdrop', 'claim', 'free', 'reward', 'bonus', 'support', 'verify'];
        const name = token.name.toLowerCase();

        for (const term of suspiciousNameTerms) {
          if (name.includes(term)) {
            suspiciousReasons.push(`Name contains suspicious term: ${term}`);
            break;
          }
        }

        // Check for names similar to popular tokens
        const popularTokens = ['SOL', 'USDC', 'USDT', 'ETH', 'BTC', 'BONK'];
        const upperName = token.name.toUpperCase();

        for (const popularToken of popularTokens) {
          if (upperName.includes(popularToken) && upperName !== popularToken) {
            suspiciousReasons.push(`Name similar to ${popularToken}`);
          }
        }

        // Check for website/URL in name
        if (name.includes('.com') || name.includes('.io') || name.includes('.org') || name.includes('http')) {
          suspiciousReasons.push('Name contains URL');
        }
      }

      // Check for zero or very low supply tokens
      if (token.supply && parseFloat(token.supply) < 100) {
        suspiciousReasons.push('Very low token supply');
      }

      if (suspiciousReasons.length > 0) {
        suspiciousTokens.push({
          name: token.name || 'Unknown',
          symbol: token.symbol || 'Unknown',
          mint: token.address,
          amount: token.amount,
          suspiciousReasons
        });
      }
    }

    return {
      totalTokens: tokens.length,
      suspiciousTokens
    };
  } catch (error) {
    console.error('Error analyzing wallet tokens:', error);
    return {
      suspiciousTokens: [],
      details: 'Error analyzing token data'
    };
  }
}

// Main function to detect dusting attacks
async function detectDustingAttacks(walletAddress, numTransactions = 10) {
  console.log(`\n=== Solana Dusting Attack Detector ===`);
  console.log(`Analyzing wallet: ${walletAddress}`);
  console.log(`Number of transactions to analyze: ${numTransactions}`);
  console.log('======================================\n');

  // Step 1: Get transaction signatures
  console.log('Fetching transaction signatures...');
  const signatures = await getTransactionSignatures(walletAddress, numTransactions);

  if (signatures.length === 0) {
    console.log('No transactions found for this wallet address.');
    return;
  }

  console.log(`Found ${signatures.length} transactions.\n`);

  // Step 2: Analyze each transaction
  console.log('Analyzing transactions for dusting attacks...');
  const analysisResults = [];
  let dustingCount = 0;

  // Track victim vs attacker statistics
  let victimCount = 0;
  let attackerCount = 0;
  let unknownRoleCount = 0;

  for (const signature of signatures) {
    const result = await analyzeTransaction(signature);

    // Determine if wallet is victim or attacker in this transaction
    if (result.isDusting) {
      let isVictim = false;
      let isAttacker = false;
      let hasNativeTransfer = false;
      let hasTokenTransfer = false;
      let hasMemo = false;
      let attackTypes = new Set();

      // Check each indicator to determine role and attack types
      for (const indicator of result.dustingIndicators) {
        if (indicator.type === 'native') {
          hasNativeTransfer = true;
          if (indicator.to === walletAddress) {
            isVictim = true;
            attackTypes.add('SOL_DUST');
          }
          if (indicator.from === walletAddress) {
            isAttacker = true;
            attackTypes.add('SOL_DUST');
          }
        } else if (indicator.type === 'token') {
          hasTokenTransfer = true;
          if (indicator.to === walletAddress) {
            isVictim = true;
            attackTypes.add('TOKEN_DUST');
          }
          if (indicator.from === walletAddress) {
            isAttacker = true;
            attackTypes.add('TOKEN_DUST');
          }
        } else if (indicator.type === 'memo') {
          hasMemo = true;
          attackTypes.add('MEMO_SCAM');
        }
      }

      // Set the role for this transaction
      if (isVictim && !isAttacker) {
        result.role = 'VICTIM';
        victimCount++;
      } else if (isAttacker && !isVictim) {
        result.role = 'ATTACKER';
        attackerCount++;
      } else if (isVictim && isAttacker) {
        result.role = 'BOTH'; // Self-transfers or complex transactions
        victimCount++;
        attackerCount++;
      } else {
        result.role = 'UNKNOWN'; // Can't determine (e.g., only memo indicators)
        unknownRoleCount++;
      }

      // Set attack type flags
      result.attackTypes = Array.from(attackTypes);

      // Determine the primary attack vector
      if (hasNativeTransfer && hasTokenTransfer) {
        result.primaryAttackVector = 'MIXED_DUST';
      } else if (hasNativeTransfer) {
        result.primaryAttackVector = 'SOL_DUST';
      } else if (hasTokenTransfer) {
        result.primaryAttackVector = 'TOKEN_DUST';
      } else if (hasMemo) {
        result.primaryAttackVector = 'MEMO_SCAM';
      } else {
        result.primaryAttackVector = 'UNKNOWN';
      }

      dustingCount++;
    }

    analysisResults.push(result);
  }

  // Step 3: Analyze wallet tokens
  console.log('\nAnalyzing wallet tokens for suspicious indicators...');
  const tokenAnalysis = await analyzeWalletTokens(walletAddress);

  // Step 4: Display results
  console.log('\n=== Analysis Results ===');

  // Transaction analysis results
  console.log(`\nTransaction Analysis:`);
  console.log(`Analyzed ${analysisResults.length} transactions`);
  console.log(`Found ${dustingCount} potential dusting attacks`);

  // Display role summary
  if (dustingCount > 0) {
    // Count attack vectors
    const attackVectorCounts = {};
    analysisResults.filter(r => r.isDusting).forEach(result => {
      if (result.primaryAttackVector) {
        attackVectorCounts[result.primaryAttackVector] = (attackVectorCounts[result.primaryAttackVector] || 0) + 1;
      }
    });

    console.log(`\nWallet Role Summary:`);
    if (victimCount > 0) {
      console.log(`- Victim of dusting in ${victimCount} transaction(s)`);
    }
    if (attackerCount > 0) {
      console.log(`- Sender of dusting in ${attackerCount} transaction(s)`);
    }
    if (unknownRoleCount > 0) {
      console.log(`- Unclear role in ${unknownRoleCount} transaction(s)`);
    }

    // Attack vector summary
    console.log(`\nAttack Vector Summary:`);
    Object.entries(attackVectorCounts).forEach(([vector, count]) => {
      let description = '';
      switch(vector) {
        case 'SOL_DUST':
          description = 'Small SOL transfers (classic dusting)';
          break;
        case 'TOKEN_DUST':
          description = 'Small token transfers (token dusting)';
          break;
        case 'MIXED_DUST':
          description = 'Both SOL and token transfers';
          break;
        case 'MEMO_SCAM':
          description = 'Suspicious memo content';
          break;
        default:
          description = 'Unknown attack type';
      }
      console.log(`- ${vector}: ${count} transaction(s) - ${description}`);
    });

    // Overall assessment
    console.log(`\nOverall Assessment:`);
    if (victimCount > 0 && attackerCount === 0) {
      console.log(`This wallet appears to be a VICTIM of dusting attacks.`);

      // Add attack type details to the assessment
      const attackVectors = Object.keys(attackVectorCounts);
      if (attackVectors.length > 0) {
        console.log(`Primary attack vectors: ${attackVectors.join(', ')}`);
      }
    } else if (attackerCount > 0 && victimCount === 0) {
      console.log(`This wallet appears to be an ATTACKER performing dusting attacks.`);

      // Add attack type details to the assessment
      const attackVectors = Object.keys(attackVectorCounts);
      if (attackVectors.length > 0) {
        console.log(`Primary attack vectors: ${attackVectors.join(', ')}`);
      }
    } else if (victimCount > 0 && attackerCount > 0) {
      console.log(`This wallet has both SENT and RECEIVED dusting transactions.`);

      // Add attack type details to the assessment
      const attackVectors = Object.keys(attackVectorCounts);
      if (attackVectors.length > 0) {
        console.log(`Primary attack vectors: ${attackVectors.join(', ')}`);
      }
    } else {
      console.log(`Unable to determine this wallet's role in dusting activity.`);
    }

    console.log('\nPotential Dusting Attacks:');
    analysisResults.filter(r => r.isDusting).forEach((result, index) => {
      console.log(`\n${index + 1}. Transaction: ${result.signature.substring(0, 16)}...`);
      console.log(`   Type: ${result.type}`);
      console.log(`   Role: ${result.role || 'UNKNOWN'}`);
      console.log(`   Attack Vector: ${result.primaryAttackVector}`);
      if (result.attackTypes && result.attackTypes.length > 0) {
        console.log(`   Attack Types: ${result.attackTypes.join(', ')}`);
      }
      console.log(`   Description: ${result.description}`);
      console.log(`   Timestamp: ${new Date(result.timestamp * 1000).toLocaleString()}`);

      result.dustingIndicators.forEach(indicator => {
        console.log(`   - ${indicator.reason}`);

        // Display based on indicator type
        if (indicator.type === 'native' || indicator.type === 'token') {
          // For native and token transfers
          if (indicator.from) {
            console.log(`     From: ${indicator.from}${indicator.from === walletAddress ? ' (THIS WALLET)' : ''}`);
          }
          if (indicator.to) {
            console.log(`     To: ${indicator.to}${indicator.to === walletAddress ? ' (THIS WALLET)' : ''}`);
          }

          if (indicator.type === 'native') {
            console.log(`     Amount: ${indicator.amount} SOL`);
          } else if (indicator.type === 'token') {
            console.log(`     Token: ${indicator.token}`);
            console.log(`     Amount: ${indicator.amount}`);
          }
        } else if (indicator.type === 'memo') {
          // For memo indicators
          console.log(`     Memo content: "${indicator.content}"`);
          console.log(`     Suspicious score: ${indicator.suspiciousScore} (higher = more suspicious)`);
        }
      });
    });
  }

  // Token analysis results
  console.log(`\nToken Analysis:`);
  if (tokenAnalysis.totalTokens === undefined) {
    console.log('No token data available for this wallet');
  } else {
    console.log(`Found ${tokenAnalysis.suspiciousTokens.length} suspicious tokens out of ${tokenAnalysis.totalTokens} total tokens`);

    if (tokenAnalysis.suspiciousTokens.length > 0) {
      console.log('\nSuspicious Tokens:');
      tokenAnalysis.suspiciousTokens.forEach((token, index) => {
        console.log(`\n${index + 1}. ${token.name} (${token.symbol})`);
        console.log(`   Mint: ${token.mint}`);
        console.log(`   Amount: ${token.amount}`);
        console.log(`   Suspicious indicators: ${token.suspiciousReasons.join(', ')}`);
      });
    }
  }

  console.log('\n=== Analysis Complete ===');
}

// Function to analyze a single transaction
async function analyzeSingleTransaction(signature) {
  console.log(`\n=== Solana Transaction Analysis ===`);
  console.log(`Analyzing transaction: ${signature}`);
  console.log('======================================\n');

  // Analyze the transaction
  console.log('Fetching and analyzing transaction...');
  const result = await analyzeTransaction(signature);

  if (!result || result.details) {
    console.log(`Error: ${result?.details || 'Transaction not found or could not be analyzed'}`);
    return;
  }

  // Display results
  console.log('\n=== Analysis Results ===');

  console.log(`\nTransaction Details:`);
  console.log(`Signature: ${result.signature}`);
  console.log(`Type: ${result.type}`);
  console.log(`Description: ${result.description}`);
  console.log(`Timestamp: ${new Date(result.timestamp * 1000).toLocaleString()}`);

  if (result.isDusting) {
    console.log(`\nDusting Attack Detected: YES`);
    console.log(`Primary Attack Vector: ${result.primaryAttackVector || 'UNKNOWN'}`);

    if (result.attackTypes && result.attackTypes.length > 0) {
      console.log(`Attack Types: ${result.attackTypes.join(', ')}`);
    }

    console.log('\nSuspicious Indicators:');
    result.dustingIndicators.forEach((indicator, index) => {
      console.log(`\n${index + 1}. ${indicator.reason}`);

      // Display based on indicator type
      if (indicator.type === 'native' || indicator.type === 'token') {
        // For native and token transfers
        if (indicator.from) console.log(`   From: ${indicator.from}`);
        if (indicator.to) console.log(`   To: ${indicator.to}`);

        if (indicator.type === 'native') {
          console.log(`   Amount: ${indicator.amount} SOL`);
        } else if (indicator.type === 'token') {
          console.log(`   Token: ${indicator.token}`);
          console.log(`   Amount: ${indicator.amount}`);
        }
      } else if (indicator.type === 'memo') {
        // For memo indicators
        console.log(`   Memo content: "${indicator.content}"`);
        console.log(`   Suspicious score: ${indicator.suspiciousScore} (higher = more suspicious)`);
      }
    });
  } else {
    console.log(`\nDusting Attack Detected: NO`);
    console.log('No suspicious indicators found in this transaction.');
  }

  console.log('\n=== Analysis Complete ===');
}

// Function to analyze transactions in a block range
async function analyzeBlockRange(startSlot, endSlot, maxTransactions = 100) {
  console.log(`\n=== Solana Block Range Analysis ===`);
  console.log(`Analyzing blocks from slot ${startSlot} to ${endSlot}`);
  console.log(`Maximum transactions to analyze: ${maxTransactions}`);
  console.log('======================================\n');

  try {
    // Get transactions in the block range
    console.log('Fetching transactions in block range...');
    const response = await makeRpcRequest('getBlocksWithLimit', [
      parseInt(startSlot),
      parseInt(endSlot - startSlot + 1)
    ]);

    if (!response || !response.result || !Array.isArray(response.result)) {
      console.log('Error: Could not retrieve blocks in the specified range');
      return;
    }

    const blockSlots = response.result;
    console.log(`Found ${blockSlots.length} blocks in range`);

    // Get transactions from each block, up to the maximum
    let allTransactions = [];
    let transactionsAnalyzed = 0;
    let dustingCount = 0;

    for (const slot of blockSlots) {
      if (transactionsAnalyzed >= maxTransactions) break;

      console.log(`Fetching transactions from block ${slot}...`);
      const blockResponse = await makeRpcRequest('getBlock', [
        slot,
        { maxSupportedTransactionVersion: 0, encoding: 'json' }
      ]);

      if (blockResponse && blockResponse.result && blockResponse.result.transactions) {
        const blockTransactions = blockResponse.result.transactions.map(tx => tx.transaction.signatures[0]);
        console.log(`Found ${blockTransactions.length} transactions in block ${slot}`);

        // Add transactions up to the maximum
        const remainingSlots = maxTransactions - transactionsAnalyzed;
        const transactionsToAdd = blockTransactions.slice(0, remainingSlots);
        allTransactions = allTransactions.concat(transactionsToAdd);
        transactionsAnalyzed += transactionsToAdd.length;
      }
    }

    console.log(`\nAnalyzing ${allTransactions.length} transactions from block range...`);

    // Analyze each transaction
    const analysisResults = [];

    for (const signature of allTransactions) {
      const result = await analyzeTransaction(signature);
      analysisResults.push(result);

      if (result.isDusting) {
        dustingCount++;
      }

      // Show progress
      process.stdout.write(`Analyzed ${analysisResults.length}/${allTransactions.length} transactions\r`);
    }

    console.log('\n');  // Clear the progress line

    // Display results
    console.log('\n=== Analysis Results ===');
    console.log(`\nBlock Range Analysis:`);
    console.log(`Analyzed ${analysisResults.length} transactions from blocks ${startSlot} to ${endSlot}`);
    console.log(`Found ${dustingCount} potential dusting attacks (${((dustingCount / analysisResults.length) * 100).toFixed(2)}% of transactions)`);

    if (dustingCount > 0) {
      console.log('\nPotential Dusting Attacks:');
      analysisResults.filter(r => r.isDusting).forEach((result, index) => {
        console.log(`\n${index + 1}. Transaction: ${result.signature.substring(0, 16)}...`);
        console.log(`   Type: ${result.type}`);
        console.log(`   Attack Vector: ${result.primaryAttackVector || 'UNKNOWN'}`);
        console.log(`   Description: ${result.description}`);
        console.log(`   Timestamp: ${new Date(result.timestamp * 1000).toLocaleString()}`);
      });
    }

    console.log('\n=== Analysis Complete ===');
  } catch (error) {
    console.error('Error analyzing block range:', error);
  }
}

// Function to analyze a token mint address
async function analyzeTokenMint(tokenMint, maxTransactions = 50) {
  console.log(`\n=== Solana Token Analysis ===`);
  console.log(`Analyzing token mint: ${tokenMint}`);
  console.log(`Maximum transactions to analyze: ${maxTransactions}`);
  console.log('======================================\n');

  try {
    // Try multiple approaches to get token metadata
    console.log('Fetching token metadata...');

    // First try the tokens endpoint
    let tokenMetadata = await makeApiRequest(`/tokens/${tokenMint}`);

    // If that fails, try the token metadata endpoint
    if (!tokenMetadata || Object.keys(tokenMetadata).length === 0) {
      const metadataResponse = await makeRpcRequest('getTokenSupply', [tokenMint]);
      if (metadataResponse && metadataResponse.result) {
        tokenMetadata = {
          decimals: metadataResponse.result.value.decimals,
          supply: metadataResponse.result.value.uiAmount
        };

        // Try to get additional metadata from token accounts
        try {
          const accountsResponse = await makeRpcRequest('getTokenLargestAccounts', [tokenMint]);
          if (accountsResponse && accountsResponse.result && accountsResponse.result.value.length > 0) {
            const largestAccount = accountsResponse.result.value[0].address;
            const accountInfoResponse = await makeRpcRequest('getAccountInfo', [largestAccount, {encoding: 'jsonParsed'}]);
            if (accountInfoResponse && accountInfoResponse.result && accountInfoResponse.result.value) {
              const info = accountInfoResponse.result.value.data.parsed.info;
              if (info.tokenAmount) {
                tokenMetadata.decimals = info.tokenAmount.decimals;
              }
            }
          }
        } catch (e) {
          // Ignore errors in this additional metadata fetch
        }
      }
    }

    // Try to get USDC info specifically if this is USDC
    if (tokenMint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
      tokenMetadata = {
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        supply: 'Large (Stablecoin)',
        description: 'A stablecoin pegged to the US Dollar',
        isVerified: true,
        isStablecoin: true
      };
    }

    if (tokenMetadata && Object.keys(tokenMetadata).length > 0) {
      console.log('\nToken Information:');
      console.log(`Name: ${tokenMetadata.name || 'Unknown'}`);
      console.log(`Symbol: ${tokenMetadata.symbol || 'Unknown'}`);
      console.log(`Decimals: ${tokenMetadata.decimals || 'Unknown'}`);
      console.log(`Supply: ${tokenMetadata.supply || 'Unknown'}`);

      if (tokenMetadata.isVerified) {
        console.log(`Verified: Yes`);
      }

      if (tokenMetadata.isStablecoin) {
        console.log(`Type: Stablecoin`);
      }

      if (tokenMetadata.description) {
        console.log(`Description: ${tokenMetadata.description}`);
      }
    } else {
      console.log('\nToken Information:');
      console.log('Could not retrieve detailed token metadata');
      console.log('This may be an inactive token or the token address may be incorrect');
    }

    // Try multiple approaches to get transactions
    console.log('\nFetching transactions involving this token...');

    // For USDC, use the Parsed Transaction History API
    if (tokenMint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') { // USDC
      console.log(`Using Parsed Transaction History API for USDC...`);

      // List of active USDC accounts to check
      const usdcAccounts = [
        'FEMZRzfbpXrECPpMnP7Jvxs2jNMwYbVgqQhLJ8AQBLx5', // Solana USDC Treasury
        '8ZwwTBZ3DNxS3J9qWWPAZVz4FgFBXNFgA9uVyPVF6xBU', // Another active USDC account
        'A9o4K7Li3u1E8orSH6PJkaDDGE4rMzWVzGtpTEJFzZo5', // Jupiter aggregator
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'  // USDC mint itself
      ];

      let allTransactions = [];

      // Try each account until we get enough transactions
      for (const account of usdcAccounts) {
        if (allTransactions.length >= maxTransactions) break;

        try {
          console.log(`Fetching SPL transactions for account ${account.substring(0, 8)}...`);

          // Use the addresses/{address}/transactions endpoint with type=spl
          const txResponse = await fetch(`${HELIUS_API_URL}/addresses/${account}/transactions?api-key=${HELIUS_API_KEY}&type=spl&limit=${maxTransactions}`);
          const txData = await txResponse.json();

          if (txData && Array.isArray(txData)) {
            console.log(`Found ${txData.length} SPL transactions for this account`);

            // Filter to only include transactions that involve USDC
            const usdcTxs = txData.filter(tx => {
              // Check token transfers
              if (tx.tokenTransfers) {
                return tx.tokenTransfers.some(transfer => transfer.mint === tokenMint);
              }
              return false;
            });

            console.log(`Found ${usdcTxs.length} USDC transactions for this account`);
            allTransactions = allTransactions.concat(usdcTxs);
          }
        } catch (e) {
          console.log(`Error fetching transactions for account ${account}: ${e.message}`);
        }
      }

      // Deduplicate by signature and limit
      const uniqueSignatures = new Set();
      const uniqueTransactions = [];

      for (const tx of allTransactions) {
        if (!uniqueSignatures.has(tx.signature) && uniqueTransactions.length < maxTransactions) {
          uniqueSignatures.add(tx.signature);
          uniqueTransactions.push(tx);
        }
      }

      console.log(`Found ${uniqueTransactions.length} unique USDC transactions`);
      response = uniqueTransactions;
    }
    // For other popular tokens, use a direct approach to find transactions
    else if (tokenMint === 'So11111111111111111111111111111111111111112' || // Wrapped SOL
             tokenMint === 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So') { // Marinade SOL

      // For popular tokens, use known accounts that frequently interact with them
      const popularTokenAccounts = {
        'So11111111111111111111111111111111111111112': [ // Wrapped SOL
          'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
          '3uTzTX5GBSfbW7eM9R9k95H7Txe32Qw3Z25MtyD2dzwC' // Raydium
        ],
        'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': [ // Marinade SOL
          '8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC', // Marinade finance
          'DwFYJNnhLmw19FBTrVaLWZ8SZJpxdPoSYVSJaio9tjbY' // Marinade stake pool
        ]
      };

      const accounts = popularTokenAccounts[tokenMint];
      console.log(`Using known accounts for ${tokenMetadata?.symbol || tokenMint}...`);

      // Get signatures for these accounts
      let allSignatures = [];
      for (const account of accounts) {
        try {
          const sigResponse = await makeRpcRequest('getSignaturesForAddress', [
            account,
            { limit: Math.ceil(maxTransactions / accounts.length) }
          ]);

          if (sigResponse && sigResponse.result) {
            allSignatures = allSignatures.concat(sigResponse.result.map(sig => sig.signature));
          }
        } catch (e) {
          console.log(`Error fetching signatures for account ${account}: ${e.message}`);
        }
      }

      // Deduplicate and limit
      allSignatures = [...new Set(allSignatures)].slice(0, maxTransactions);
      console.log(`Found ${allSignatures.length} transaction signatures. Fetching transaction details...`);

      // Use the transactions endpoint to get details for these signatures
      // Process in batches of 100 (API limit)
      let allTransactions = [];
      for (let i = 0; i < allSignatures.length; i += 100) {
        const batch = allSignatures.slice(i, i + 100);
        try {
          const txResponse = await makeApiRequest('/transactions', 'POST', {
            transactions: batch
          });

          if (txResponse && Array.isArray(txResponse)) {
            // Filter to only include transactions that involve our token
            const relevantTxs = txResponse.filter(tx => {
              // Check token transfers
              if (tx.tokenTransfers) {
                return tx.tokenTransfers.some(transfer => transfer.mint === tokenMint);
              }
              return false;
            });

            allTransactions = allTransactions.concat(relevantTxs);
          }
        } catch (e) {
          console.log(`Error fetching transaction details for batch: ${e.message}`);
        }
      }

      console.log(`Found ${allTransactions.length} transactions involving this token`);
      response = allTransactions;
    } else {
      // For other tokens, try the standard query approach
      response = await makeApiRequest('/transactions', 'POST', {
        query: {
          startSlot: 0,
          endSlot: 500000000,  // A very high number to get recent transactions
          limit: maxTransactions,
          tokenMints: [tokenMint]
        }
      });
    }

    // If that fails, try a different approach
    if (!response || !Array.isArray(response) || response.length === 0) {
      // Try to get transactions by searching for token accounts first
      try {
        const accountsResponse = await makeRpcRequest('getTokenLargestAccounts', [tokenMint]);
        if (accountsResponse && accountsResponse.result && accountsResponse.result.value.length > 0) {
          const tokenAccounts = accountsResponse.result.value.slice(0, 5).map(a => a.address);

          // Get transactions for these accounts
          let allTxs = [];
          for (const account of tokenAccounts) {
            const txResponse = await makeRpcRequest('getSignaturesForAddress', [account, { limit: Math.ceil(maxTransactions / tokenAccounts.length) }]);
            if (txResponse && txResponse.result) {
              allTxs = allTxs.concat(txResponse.result.map(tx => tx.signature));
            }
          }

          // Deduplicate transactions
          response = [...new Set(allTxs)].slice(0, maxTransactions);
        }
      } catch (e) {
        // Ignore errors in this additional fetch attempt
      }
    }

    // If we still don't have transactions, try using the Solana Explorer API
    if (!response || !Array.isArray(response) || response.length === 0) {
      console.log('No transactions found via Helius API. Trying Solana Explorer API...');

      // Special handling for USDC
      if (tokenMint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
        console.log('Using Solana Explorer API to fetch USDC transactions...');

        try {
          // Get recent transactions directly from Explorer API
          const explorerResponse = await makeExplorerRequest('/tokens/transfers', {
            limit: maxTransactions,
            offset: 0,
            mint: tokenMint
          });

          if (explorerResponse && explorerResponse.data && explorerResponse.data.length > 0) {
            console.log(`Found ${explorerResponse.data.length} USDC transactions via Explorer API`);

            // Convert to signatures
            const signatures = explorerResponse.data.map(item => item.signature);

            // Now get full transaction details using Helius
            let allTransactions = [];
            for (let i = 0; i < signatures.length; i += 100) {
              const batch = signatures.slice(i, i + 100);
              try {
                const txResponse = await makeApiRequest('/transactions', 'POST', {
                  transactions: batch
                });

                if (txResponse && Array.isArray(txResponse)) {
                  allTransactions = allTransactions.concat(txResponse);
                }
              } catch (e) {
                console.log(`Error fetching transaction details for batch: ${e.message}`);
              }
            }

            response = allTransactions;
            console.log(`Successfully fetched ${response.length} USDC transactions`);
          }
        } catch (e) {
          console.log('Error fetching USDC transactions from Explorer API:', e.message);
        }
      }

      // If Explorer API didn't work or this isn't USDC, try public RPC
      if (!response || !Array.isArray(response) || response.length === 0) {
        console.log('Trying public Solana RPC...');

        // For popular tokens, use known accounts that frequently interact with them
        const popularTokens = {
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { // USDC
            accounts: [
              'FEMZRzfbpXrECPpMnP7Jvxs2jNMwYbVgqQhLJ8AQBLx5', // Solana USDC Treasury
              '8ZwwTBZ3DNxS3J9qWWPAZVz4FgFBXNFgA9uVyPVF6xBU', // Another active USDC account
              'A9o4K7Li3u1E8orSH6PJkaDDGE4rMzWVzGtpTEJFzZo5' // Jupiter aggregator
            ]
          },
          'So11111111111111111111111111111111111111112': { // Wrapped SOL
            accounts: [
              'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
              '3uTzTX5GBSfbW7eM9R9k95H7Txe32Qw3Z25MtyD2dzwC' // Raydium
            ]
          },
          'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { // Marinade SOL
            accounts: [
              '8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC', // Marinade finance
              'DwFYJNnhLmw19FBTrVaLWZ8SZJpxdPoSYVSJaio9tjbY' // Marinade stake pool
            ]
          }
        };

        // Check if this is a popular token
        if (popularTokens[tokenMint]) {
          const knownAccounts = popularTokens[tokenMint].accounts;
          console.log(`Using known accounts for ${tokenMetadata?.symbol || tokenMint}...`);

          let allTxs = [];
          for (const account of knownAccounts) {
            // Try with public RPC first
            const txResponse = await makePublicRpcRequest('getSignaturesForAddress', [
              account,
              { limit: Math.ceil(maxTransactions / knownAccounts.length) }
            ]);

            if (txResponse && txResponse.result) {
              allTxs = allTxs.concat(txResponse.result.map(tx => tx.signature));
            }
          }

          // Deduplicate transactions
          if (allTxs.length > 0) {
            response = [...new Set(allTxs)].slice(0, maxTransactions);
            console.log(`Found ${response.length} transactions via public RPC`);
          }
        } else {
          // For other tokens, try to get token accounts via public RPC
          console.log('Trying to find token accounts via public RPC...');
          try {
            // Get token accounts
            const accountsResponse = await makePublicRpcRequest('getTokenLargestAccounts', [tokenMint]);

            if (accountsResponse && accountsResponse.result && accountsResponse.result.value.length > 0) {
              const tokenAccounts = accountsResponse.result.value.slice(0, 3).map(a => a.address);
              console.log(`Found ${tokenAccounts.length} token accounts. Fetching their transactions...`);

              let allTxs = [];
              for (const account of tokenAccounts) {
                const txResponse = await makePublicRpcRequest('getSignaturesForAddress', [
                  account,
                  { limit: Math.ceil(maxTransactions / tokenAccounts.length) }
                ]);

                if (txResponse && txResponse.result) {
                  allTxs = allTxs.concat(txResponse.result.map(tx => tx.signature));
                }
              }

              // Deduplicate transactions
              if (allTxs.length > 0) {
                response = [...new Set(allTxs)].slice(0, maxTransactions);
                console.log(`Found ${response.length} transactions via public RPC`);
              }
            }
          } catch (e) {
            console.log('Error fetching token accounts via public RPC:', e.message);
          }
        }
      }
    }

    // Process transactions if we have any
    let transactions = [];
    if (response && Array.isArray(response)) {
      if (response[0] && response[0].signature) {
        // If response contains objects with signature property
        transactions = response.map(tx => tx.signature);
      } else {
        // If response is already an array of signatures
        transactions = response;
      }
    }

    console.log(`Found ${transactions.length} transactions involving this token`);

    if (transactions.length === 0) {
      console.log('\nNo transactions found for this token. This could mean:');
      console.log('1. The token is inactive or rarely used');
      console.log('2. The token address may be incorrect');
      console.log('3. The token may be very new with limited transaction history');

      console.log('\n=== Analysis Results ===');
      console.log(`\nToken Analysis for ${tokenMetadata?.symbol || tokenMint}:`);
      console.log('No transactions available for analysis');
      console.log('\nAssessment: Unable to determine if this token is used for dusting attacks due to insufficient data');
      console.log('\n=== Analysis Complete ===');
      return;
    }

    // Analyze each transaction
    console.log('\nAnalyzing transactions for dusting patterns...');
    const analysisResults = [];
    let dustingCount = 0;

    for (const signature of transactions) {
      const result = await analyzeTransaction(signature);
      analysisResults.push(result);

      if (result.isDusting) {
        dustingCount++;
      }

      // Show progress
      process.stdout.write(`Analyzed ${analysisResults.length}/${transactions.length} transactions\r`);
    }

    console.log('\n');  // Clear the progress line

    // Display results
    console.log('\n=== Analysis Results ===');
    console.log(`\nToken Analysis for ${tokenMetadata?.symbol || tokenMint}:`);
    console.log(`Analyzed ${analysisResults.length} transactions involving this token`);

    if (analysisResults.length > 0) {
      const dustingPercentage = (dustingCount / analysisResults.length) * 100;
      console.log(`Found ${dustingCount} potential dusting attacks (${dustingPercentage.toFixed(2)}% of transactions)`);

      // Determine if this token is commonly used for dusting
      const isDustingToken = dustingCount > (analysisResults.length * 0.2);  // If more than 20% of transactions are dusting

      if (tokenMetadata && tokenMetadata.isVerified) {
        console.log(`\nAssessment: This is a verified token (${tokenMetadata.symbol}) and is ${isDustingToken ? 'SOMETIMES' : 'RARELY'} used for dusting attacks`);
      } else {
        console.log(`\nAssessment: This token is ${isDustingToken ? 'LIKELY' : 'UNLIKELY'} to be used for dusting attacks`);
      }

      if (dustingCount > 0) {
        console.log('\nPotential Dusting Attacks:');
        analysisResults.filter(r => r.isDusting).forEach((result, index) => {
          console.log(`\n${index + 1}. Transaction: ${result.signature.substring(0, 16)}...`);
          console.log(`   Type: ${result.type}`);
          console.log(`   Attack Vector: ${result.primaryAttackVector || 'UNKNOWN'}`);
          console.log(`   Description: ${result.description}`);
          console.log(`   Timestamp: ${new Date(result.timestamp * 1000).toLocaleString()}`);
        });
      }
    } else {
      console.log('No valid transactions could be analyzed');
      console.log('\nAssessment: Unable to determine if this token is used for dusting attacks due to insufficient data');
    }

    console.log('\n=== Analysis Complete ===');
  } catch (error) {
    console.error('Error analyzing token mint:', error);
    console.log('\n=== Analysis Results ===');
    console.log('\nAn error occurred while analyzing this token');
    console.log('This may be due to API rate limits or an invalid token address');
    console.log('\n=== Analysis Complete ===');
  }
}

// Function to analyze multiple wallets (batch analysis)
async function analyzeBatchWallets(wallets, numTransactions = 10) {
  console.log(`\n=== Solana Batch Wallet Analysis ===`);
  console.log(`Analyzing ${wallets.length} wallets`);
  console.log(`Transactions per wallet: ${numTransactions}`);
  console.log('======================================\n');

  const results = [];

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    console.log(`\nAnalyzing wallet ${i+1}/${wallets.length}: ${wallet}`);

    // Get transaction signatures
    const signatures = await getTransactionSignatures(wallet, numTransactions);

    if (signatures.length === 0) {
      console.log(`No transactions found for wallet: ${wallet}`);
      results.push({
        wallet,
        transactionsAnalyzed: 0,
        dustingCount: 0,
        victimCount: 0,
        attackerCount: 0,
        isDusting: false,
        role: 'UNKNOWN'
      });
      continue;
    }

    // Analyze each transaction
    const analysisResults = [];
    let dustingCount = 0;
    let victimCount = 0;
    let attackerCount = 0;

    for (const signature of signatures) {
      const result = await analyzeTransaction(signature);
      analysisResults.push(result);

      if (result.isDusting) {
        dustingCount++;

        // Determine role in this transaction
        let isVictim = false;
        let isAttacker = false;

        for (const indicator of result.dustingIndicators) {
          if (indicator.type === 'native' || indicator.type === 'token') {
            if (indicator.to === wallet) {
              isVictim = true;
            }
            if (indicator.from === wallet) {
              isAttacker = true;
            }
          }
        }

        if (isVictim) victimCount++;
        if (isAttacker) attackerCount++;
      }

      // Show progress
      process.stdout.write(`Analyzed ${analysisResults.length}/${signatures.length} transactions\r`);
    }

    console.log('\n');  // Clear the progress line

    // Determine overall role
    let role = 'UNKNOWN';
    if (victimCount > 0 && attackerCount === 0) {
      role = 'VICTIM';
    } else if (attackerCount > 0 && victimCount === 0) {
      role = 'ATTACKER';
    } else if (victimCount > 0 && attackerCount > 0) {
      role = 'BOTH';
    }

    // Store results
    results.push({
      wallet,
      transactionsAnalyzed: signatures.length,
      dustingCount,
      victimCount,
      attackerCount,
      isDusting: dustingCount > 0,
      role
    });

    // Show summary for this wallet
    console.log(`Summary for ${wallet}:`);
    console.log(`- Transactions analyzed: ${signatures.length}`);
    console.log(`- Dusting transactions: ${dustingCount}`);
    console.log(`- Role: ${role}`);
  }

  // Display overall batch results
  console.log('\n=== Batch Analysis Results ===');
  console.log(`\nWallet Summary:`);

  const totalWallets = results.length;
  const dustingWallets = results.filter(r => r.isDusting).length;
  const victimWallets = results.filter(r => r.role === 'VICTIM').length;
  const attackerWallets = results.filter(r => r.role === 'ATTACKER').length;
  const mixedWallets = results.filter(r => r.role === 'BOTH').length;

  console.log(`Total wallets analyzed: ${totalWallets}`);
  console.log(`Wallets with dusting activity: ${dustingWallets} (${((dustingWallets / totalWallets) * 100).toFixed(2)}%)`);
  console.log(`Victim wallets: ${victimWallets} (${((victimWallets / totalWallets) * 100).toFixed(2)}%)`);
  console.log(`Attacker wallets: ${attackerWallets} (${((attackerWallets / totalWallets) * 100).toFixed(2)}%)`);
  console.log(`Mixed role wallets: ${mixedWallets} (${((mixedWallets / totalWallets) * 100).toFixed(2)}%)`);

  console.log('\nDetailed Results:');
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. Wallet: ${result.wallet}`);
    console.log(`   Role: ${result.role}`);
    console.log(`   Dusting Transactions: ${result.dustingCount}/${result.transactionsAnalyzed}`);
    if (result.role !== 'UNKNOWN') {
      if (result.victimCount > 0) {
        console.log(`   Victim in ${result.victimCount} transaction(s)`);
      }
      if (result.attackerCount > 0) {
        console.log(`   Attacker in ${result.attackerCount} transaction(s)`);
      }
    }
  });

  console.log('\n=== Analysis Complete ===');
}

// Parse a date string or timestamp into a Unix timestamp
function parseDate(dateInput) {
  // If it's already a number, assume it's a timestamp
  if (typeof dateInput === 'number') {
    return dateInput;
  }

  // If it's a Date object, convert to timestamp
  if (dateInput instanceof Date) {
    return Math.floor(dateInput.getTime() / 1000);
  }

  // If it's a string, try to parse it
  if (typeof dateInput === 'string') {
    // First try parsing as a timestamp
    const parsedTimestamp = parseInt(dateInput, 10);
    if (!isNaN(parsedTimestamp)) {
      return parsedTimestamp;
    }

    // Try parsing as a date string
    const parsedDate = new Date(dateInput);
    if (!isNaN(parsedDate.getTime())) {
      return Math.floor(parsedDate.getTime() / 1000);
    }
  }

  // If we couldn't parse it, throw an error
  throw new Error(`Could not parse date: ${dateInput}`);
}

// Function to analyze transactions within a time range
async function analyzeTimeRange(walletAddress, startTime, endTime, maxTransactions = 50) {
  // Convert times to Unix timestamps
  let startTimestamp, endTimestamp;

  try {
    startTimestamp = parseDate(startTime);
    endTimestamp = parseDate(endTime);
  } catch (error) {
    console.error(`Error parsing date: ${error.message}`);
    throw error;
  }

  console.log(`\n=== Solana Time-Based Analysis ===`);
  console.log(`Analyzing wallet: ${walletAddress}`);
  console.log(`Time range: ${new Date(startTimestamp * 1000).toLocaleString()} to ${new Date(endTimestamp * 1000).toLocaleString()}`);
  console.log(`Maximum transactions to analyze: ${maxTransactions}`);
  console.log('======================================\n');

  try {

    // Get transactions in the time range
    console.log('Fetching transactions in time range...');

    // Unfortunately, Helius API doesn't directly support time-based filtering
    // So we'll get all transactions and filter them by timestamp
    const signatures = await getTransactionSignatures(walletAddress, 100);  // Get more than needed to filter

    if (signatures.length === 0) {
      console.log('No transactions found for this wallet address.');
      return;
    }

    console.log(`Found ${signatures.length} transactions, filtering by time range...`);

    // Analyze each transaction to check its timestamp
    const analysisResults = [];
    let dustingCount = 0;
    let victimCount = 0;
    let attackerCount = 0;
    let unknownRoleCount = 0;

    for (const signature of signatures) {
      const result = await analyzeTransaction(signature);

      // Check if transaction is within the time range
      if (result.timestamp >= startTimestamp && result.timestamp <= endTimestamp) {
        analysisResults.push(result);

        // Determine role in this transaction if it's a dusting attack
        if (result.isDusting) {
          dustingCount++;

          let isVictim = false;
          let isAttacker = false;

          for (const indicator of result.dustingIndicators) {
            if (indicator.type === 'native' || indicator.type === 'token') {
              if (indicator.to === walletAddress) {
                isVictim = true;
              }
              if (indicator.from === walletAddress) {
                isAttacker = true;
              }
            }
          }

          if (isVictim && !isAttacker) {
            result.role = 'VICTIM';
            victimCount++;
          } else if (isAttacker && !isVictim) {
            result.role = 'ATTACKER';
            attackerCount++;
          } else if (isVictim && isAttacker) {
            result.role = 'BOTH';
            victimCount++;
            attackerCount++;
          } else {
            result.role = 'UNKNOWN';
            unknownRoleCount++;
          }
        }

        // Stop if we've reached the maximum number of transactions
        if (analysisResults.length >= maxTransactions) {
          break;
        }
      }

      // Show progress
      process.stdout.write(`Analyzed ${analysisResults.length} transactions in time range\r`);
    }

    console.log('\n');  // Clear the progress line

    // Display results
    console.log('\n=== Analysis Results ===');
    console.log(`\nTime-Based Analysis for ${walletAddress}:`);
    console.log(`Time range: ${new Date(startTimestamp * 1000).toLocaleString()} to ${new Date(endTimestamp * 1000).toLocaleString()}`);
    console.log(`Transactions in time range: ${analysisResults.length}`);
    console.log(`Dusting transactions: ${dustingCount} (${((dustingCount / analysisResults.length) * 100).toFixed(2)}% of transactions)`);

    if (dustingCount > 0) {
      // Display role summary
      console.log(`\nWallet Role Summary:`);
      if (victimCount > 0) {
        console.log(`- Victim of dusting in ${victimCount} transaction(s)`);
      }
      if (attackerCount > 0) {
        console.log(`- Sender of dusting in ${attackerCount} transaction(s)`);
      }
      if (unknownRoleCount > 0) {
        console.log(`- Unclear role in ${unknownRoleCount} transaction(s)`);
      }

      // Overall assessment
      console.log(`\nOverall Assessment:`);
      if (victimCount > 0 && attackerCount === 0) {
        console.log(`This wallet appears to be a VICTIM of dusting attacks during this time period.`);
      } else if (attackerCount > 0 && victimCount === 0) {
        console.log(`This wallet appears to be an ATTACKER performing dusting attacks during this time period.`);
      } else if (victimCount > 0 && attackerCount > 0) {
        console.log(`This wallet has both SENT and RECEIVED dusting transactions during this time period.`);
      } else {
        console.log(`Unable to determine this wallet's role in dusting activity during this time period.`);
      }

      console.log('\nPotential Dusting Attacks:');
      analysisResults.filter(r => r.isDusting).forEach((result, index) => {
        console.log(`\n${index + 1}. Transaction: ${result.signature.substring(0, 16)}...`);
        console.log(`   Type: ${result.type}`);
        console.log(`   Role: ${result.role || 'UNKNOWN'}`);
        console.log(`   Attack Vector: ${result.primaryAttackVector || 'UNKNOWN'}`);
        console.log(`   Description: ${result.description}`);
        console.log(`   Timestamp: ${new Date(result.timestamp * 1000).toLocaleString()}`);
      });
    } else {
      console.log('\nNo dusting attacks detected in this time range.');
    }

    console.log('\n=== Analysis Complete ===');
  } catch (error) {
    console.error('Error analyzing time range:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(`
Usage:
  1. Analyze wallet: node dusting-detector.js wallet <wallet-address> [num-transactions]
  2. Analyze transaction: node dusting-detector.js tx <transaction-signature>
  3. Analyze block range: node dusting-detector.js blocks <start-slot> <end-slot> [max-transactions]
  4. Analyze token mint: node dusting-detector.js token <token-mint-address> [max-transactions]
  5. Analyze multiple wallets: node dusting-detector.js batch <wallet1,wallet2,wallet3,...> [transactions-per-wallet]
  6. Analyze time range: node dusting-detector.js time <wallet-address> <start-date> <end-date> [max-transactions]

Examples:
  node dusting-detector.js wallet vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg 20
  node dusting-detector.js tx 4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf
  node dusting-detector.js blocks 150000000 150000100 50
  node dusting-detector.js token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 30
  node dusting-detector.js batch vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg,HMBKn2hPdLLEadXxKxM2bfeqHeXxqtVMpB8e9yJDTc5z 15
  node dusting-detector.js time vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg 1640995200 1672531200 30
  node dusting-detector.js time vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg "2022-01-01" "2022-12-31" 30
  node dusting-detector.js time vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg "Jan 1, 2022" "Dec 31, 2022" 30
  `);
  process.exit(1);
}

const mode = args[0].toLowerCase();

if (mode === 'wallet') {
  if (args.length < 2) {
    console.error('Error: Wallet address is required for wallet analysis mode');
    process.exit(1);
  }

  const walletAddress = args[1];
  const numTransactions = args.length > 2 ? parseInt(args[2], 10) : 10;

  // Run the wallet detector
  detectDustingAttacks(walletAddress, numTransactions).catch(error => {
    console.error('Error running dusting attack detector:', error);
    process.exit(1);
  });
} else if (mode === 'tx') {
  if (args.length < 2) {
    console.error('Error: Transaction signature is required for transaction analysis mode');
    process.exit(1);
  }

  const signature = args[1];

  // Run the transaction analyzer
  analyzeSingleTransaction(signature).catch(error => {
    console.error('Error analyzing transaction:', error);
    process.exit(1);
  });
} else if (mode === 'blocks') {
  if (args.length < 3) {
    console.error('Error: Start and end slots are required for block range analysis mode');
    process.exit(1);
  }

  const startSlot = parseInt(args[1], 10);
  const endSlot = parseInt(args[2], 10);
  const maxTransactions = args.length > 3 ? parseInt(args[3], 10) : 100;

  if (isNaN(startSlot) || isNaN(endSlot)) {
    console.error('Error: Start and end slots must be valid numbers');
    process.exit(1);
  }

  if (endSlot < startSlot) {
    console.error('Error: End slot must be greater than or equal to start slot');
    process.exit(1);
  }

  // Run the block range analyzer
  analyzeBlockRange(startSlot, endSlot, maxTransactions).catch(error => {
    console.error('Error analyzing block range:', error);
    process.exit(1);
  });
} else if (mode === 'token') {
  if (args.length < 2) {
    console.error('Error: Token mint address is required for token analysis mode');
    process.exit(1);
  }

  const tokenMint = args[1];
  const maxTransactions = args.length > 2 ? parseInt(args[2], 10) : 50;

  // Run the token analyzer
  analyzeTokenMint(tokenMint, maxTransactions).catch(error => {
    console.error('Error analyzing token mint:', error);
    process.exit(1);
  });
} else if (mode === 'batch') {
  if (args.length < 2) {
    console.error('Error: Comma-separated list of wallet addresses is required for batch analysis mode');
    process.exit(1);
  }

  const walletList = args[1].split(',').map(wallet => wallet.trim());
  const numTransactions = args.length > 2 ? parseInt(args[2], 10) : 10;

  if (walletList.length === 0) {
    console.error('Error: No valid wallet addresses provided');
    process.exit(1);
  }

  // Run the batch analyzer
  analyzeBatchWallets(walletList, numTransactions).catch(error => {
    console.error('Error analyzing wallets in batch:', error);
    process.exit(1);
  });
} else if (mode === 'time') {
  if (args.length < 4) {
    console.error('Error: Wallet address, start date/timestamp, and end date/timestamp are required for time-based analysis mode');
    process.exit(1);
  }

  const walletAddress = args[1];
  const startTime = args[2];
  const endTime = args[3];
  const maxTransactions = args.length > 4 ? parseInt(args[4], 10) : 50;

  // Run the time-based analyzer
  // The parseDate function in time-analyzer.js will handle the date string or timestamp conversion
  analyzeTimeRange(walletAddress, startTime, endTime, maxTransactions).catch(error => {
    console.error('Error analyzing time range:', error);
    console.error('Note: Date inputs can be Unix timestamps or date strings like "2022-01-01" or "Jan 1, 2022"');
    process.exit(1);
  });
} else {
  console.error(`Error: Unknown mode '${mode}'. Valid modes are: wallet, tx, blocks, token, batch, time`);
  process.exit(1);
}
