/**
 * Wallet Analyzer for Solana Dusting Attack Detector
 *
 * This module provides functions for analyzing Solana wallets
 * to detect potential dusting attacks.
 */

const {
  getTransactionSignatures,
  makeApiRequest
} = require('./api-helpers');

const { analyzeTransaction } = require('./transaction-analyzer');

/**
 * Analyze wallet tokens for dusting
 * @param {string} walletAddress - The wallet address to analyze
 * @returns {Promise<Object>} - Analysis results
 */
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

/**
 * Simple transaction cache to avoid repeated API calls
 * @type {Object}
 */
const transactionCache = {};

/**
 * Main function to detect dusting attacks
 * @param {string} walletAddress - The wallet address to analyze
 * @param {number} numTransactions - Number of transactions to analyze
 */
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

  // Step 2: Analyze each transaction in batches
  console.log('Analyzing transactions for dusting attacks...');
  const analysisResults = [];
  let dustingCount = 0;

  // Track victim vs attacker statistics
  let victimCount = 0;
  let attackerCount = 0;
  let unknownRoleCount = 0;

  // Process transactions in batches to avoid overwhelming the API
  const BATCH_SIZE = 5; // Process 5 transactions at a time
  const batches = [];

  // Split signatures into batches
  for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
    batches.push(signatures.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${signatures.length} transactions in ${batches.length} batches of up to ${BATCH_SIZE} transactions each`);

  // Process each batch
  let processedCount = 0;
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\nProcessing batch ${batchIndex + 1}/${batches.length}...`);

    // Process transactions in this batch
    for (const signature of batch) {
      processedCount++;

      // Check if transaction is in cache
      let result;
      if (transactionCache[signature]) {
        console.log(`Using cached data for transaction ${signature.substring(0, 8)}...`);
        result = transactionCache[signature];
      } else {
        // Not in cache, analyze the transaction
        try {
          result = await analyzeTransaction(signature);
          // Cache the result for future use
          transactionCache[signature] = result;
        } catch (error) {
          console.error(`Error analyzing transaction ${signature.substring(0, 8)}: ${error.message}`);
          // Create a placeholder result for failed transactions
          result = {
            signature,
            timestamp: Math.floor(Date.now() / 1000),
            type: 'ERROR',
            description: `Error: ${error.message}`,
            isDusting: false
          };
        }
      }

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
        if (result.type === 'TOKEN_MINT') {
          // For TOKEN_MINT transactions, determine role based on involvement
          const minterMatch = result.description && result.description.match(/([1-9A-HJ-NP-Za-km-z]{32,44}) minted/);
          const minterAddress = minterMatch ? minterMatch[1] : null;

          if (minterAddress === walletAddress) {
            // This wallet created the tokens
            result.role = 'MINTER';
            attackerCount++; // Creating suspicious tokens is considered an attack
          } else {
            // Check if this wallet received any of the minted tokens
            const isRecipient = result.dustingIndicators.some(
              indicator => indicator.type === 'token' && indicator.to === walletAddress
            );

            if (isRecipient) {
              result.role = 'VICTIM (Indirect)'; // This wallet received the suspicious tokens
              victimCount++;
            } else {
              result.role = 'OBSERVER'; // This wallet just interacted with the transaction
              unknownRoleCount++;
            }
          }
        } else {
          // For other transaction types, use the standard role determination
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

      // Show progress
      process.stdout.write(`Analyzed ${processedCount}/${signatures.length} transactions (${Math.round(processedCount/signatures.length*100)}%)\r`);
    }

    // Add a small delay between batches to avoid rate limiting
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between batches
    }
  }

  console.log(`\nCompleted analysis of ${processedCount} transactions`);


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
      // Display risk level if available
      if (result.riskLevel) {
        console.log(`   Risk Level: ${result.riskLevel}${result.riskScore ? ` (Score: ${result.riskScore})` : ''}`);
      }
      console.log(`   Description: ${result.description}`);
      console.log(`   Timestamp: ${new Date(result.timestamp * 1000).toLocaleString()}`);

      // Process indicators sequentially to handle async operations
      for (const indicator of result.dustingIndicators) {
        console.log(`   - ${indicator.reason}`);

        // Display based on indicator type
        if (indicator.type === 'native' || indicator.type === 'token') {
          // For native and token transfers
          if (indicator.from) {
            if (indicator.from === 'Unknown' && result.type === 'TOKEN_MINT') {
              console.log(`     From: Token Mint (New Token Creation)`);
            } else {
              console.log(`     From: ${indicator.from}${indicator.from === walletAddress ? ' (THIS WALLET)' : ''}`);
            }
          }
          if (indicator.to) {
            console.log(`     To: ${indicator.to}${indicator.to === walletAddress ? ' (THIS WALLET)' : ''}`);
          }

          if (indicator.type === 'native') {
            console.log(`     Amount: ${indicator.amount} SOL`);
            // Calculate USD value of SOL if possible
            try {
              const solPrice = 100; // Approximate SOL price in USD - could be fetched dynamically
              const solValue = indicator.amount * solPrice;
              console.log(`     Value: $${solValue.toFixed(4)} USD (approx.)`);
            } catch (error) {
              // Skip value display if calculation fails
            }
          } else if (indicator.type === 'token') {
            console.log(`     Token: ${indicator.token}`);
            console.log(`     Amount: ${indicator.amount}`);

            // Show token value if available
            if (indicator.valueUSD !== null && indicator.valueUSD !== undefined) {
              console.log(`     Value: $${indicator.valueUSD.toFixed(4)} USD`);
            } else {
              console.log(`     Value: $0.0000 USD (price data unavailable)`);
            }
          }
        } else if (indicator.type === 'memo') {
          // For memo indicators
          console.log(`     Memo content: "${indicator.content}"`);
          console.log(`     Suspicious score: ${indicator.suspiciousScore} (higher = more suspicious)`);
        }
      }
    });
  }

  // Collect tokens involved in dusting attacks with amounts
  const dustingTokenMap = new Map(); // Map of token mint to array of amounts
  analysisResults.filter(r => r.isDusting).forEach(result => {
    result.dustingIndicators.forEach(indicator => {
      if (indicator.type === 'token' && indicator.token) {
        if (!dustingTokenMap.has(indicator.token)) {
          dustingTokenMap.set(indicator.token, []);
        }
        // Add amount if it exists
        if (indicator.amount) {
          dustingTokenMap.get(indicator.token).push({
            amount: parseFloat(indicator.amount),
            valueUSD: indicator.valueUSD || null
          });
        }
      }
    });
  });

  // Token analysis results
  console.log(`\nToken Analysis:`);
  if (tokenAnalysis.totalTokens === undefined) {
    console.log('No token data available for this wallet');
  } else {
    // Get token mints as an array
    const dustingTokens = Array.from(dustingTokenMap.keys());

    // Include tokens involved in dusting attacks
    const dustingTokensNotInWallet = dustingTokens.filter(
      tokenMint => !tokenAnalysis.suspiciousTokens.some(token => token.mint === tokenMint)
    );

    // Check if token analysis has data
    if (tokenAnalysis.totalTokens === 0 || tokenAnalysis.totalTokens === undefined) {
      console.log(`Detected ${dustingTokens.length} suspicious tokens in transactions`);
    } else {
      console.log(`Found ${tokenAnalysis.suspiciousTokens.length} suspicious tokens out of ${tokenAnalysis.totalTokens} total tokens`);
      console.log(`Detected ${dustingTokensNotInWallet.length} additional suspicious tokens in transactions`);
    }

    // Fetch token information for all suspicious tokens
    const { getTokenPrice } = require('./token-price-fetcher');

    // Track total value for summary
    let totalValueUSD = 0;

    if (tokenAnalysis.suspiciousTokens.length > 0) {
      console.log('\nSuspicious Tokens in Wallet:');

      // Collect all token info first to avoid interleaved console output
      const walletTokenInfoArray = [];

      // Process tokens in wallet
      for (let i = 0; i < tokenAnalysis.suspiciousTokens.length; i++) {
        const token = tokenAnalysis.suspiciousTokens[i];

        // Try to get token price
        let tokenInfo;
        try {
          console.log(`Fetching price and metadata for token: ${token.mint}`);
          tokenInfo = await getTokenPrice(token.mint);
        } catch (error) {
          console.log(`Error fetching token info: ${error.message}`);
        }

        // Calculate value if price is available
        let valueUSD = null;
        if (tokenInfo && tokenInfo.price && tokenInfo.price.pricePerToken) {
          valueUSD = parseFloat(token.amount) * tokenInfo.price.pricePerToken;
          totalValueUSD += valueUSD;
        }

        // Store token info for later display
        walletTokenInfoArray.push({
          index: i + 1,
          token,
          valueUSD
        });
      }

      // Now display all token info in a clean, organized way
      for (const info of walletTokenInfoArray) {
        const token = info.token;
        console.log(`\n${info.index}. ${token.name} (${token.symbol})`);
        console.log(`   Mint: ${token.mint}`);
        console.log(`   Amount: ${token.amount}`);

        // Show value (use 0 if unavailable)
        if (info.valueUSD !== null) {
          console.log(`   Estimated Value: $${info.valueUSD.toFixed(4)} USD`);
        } else {
          console.log(`   Estimated Value: $0.0000 USD (price data unavailable)`);
        }

        console.log(`   Suspicious indicators: ${token.suspiciousReasons.join(', ')}`);
      }
    }

    if (dustingTokensNotInWallet.length > 0) {
      console.log('\nSuspicious Tokens in Transactions:');

      // Collect all token info first to avoid interleaved console output
      const tokenInfoArray = [];

      // Process tokens not in wallet
      for (let i = 0; i < dustingTokensNotInWallet.length; i++) {
        const tokenMint = dustingTokensNotInWallet[i];
        // Get amounts from the map
        const amountEntries = dustingTokenMap.get(tokenMint) || [];
        const totalAmount = amountEntries.reduce((sum, entry) => sum + entry.amount, 0);

        // Try to get token price and name
        let tokenInfo;
        try {
          console.log(`Fetching price and metadata for token: ${tokenMint}`);
          tokenInfo = await getTokenPrice(tokenMint);
        } catch (error) {
          console.log(`Error fetching token info: ${error.message}`);
        }

        // Calculate total value if price is available
        let totalTokenValueUSD = null;
        if (tokenInfo && tokenInfo.price && tokenInfo.price.pricePerToken) {
          totalTokenValueUSD = totalAmount * tokenInfo.price.pricePerToken;
          totalValueUSD += totalTokenValueUSD;
        }

        // Store token info for later display
        tokenInfoArray.push({
          index: i + 1,
          tokenMint,
          tokenInfo,
          totalAmount,
          totalTokenValueUSD,
          suspiciousIndicators: tokenInfo && tokenInfo.scamAnalysis &&
            tokenInfo.scamAnalysis.suspiciousIndicators ?
            tokenInfo.scamAnalysis.suspiciousIndicators : []
        });
      }

      // Now display all token info in a clean, organized way
      for (const info of tokenInfoArray) {
        console.log(`\n${info.index}. ${info.tokenInfo ? info.tokenInfo.name + ' (' + info.tokenInfo.symbol + ')' : 'Token Mint: ' + info.tokenMint}`);
        console.log(`   Status: Involved in dusting attack`);
        console.log(`   Total Amount Detected: ${info.totalAmount}`);

        // Show value (use 0 if unavailable)
        if (info.totalTokenValueUSD !== null) {
          console.log(`   Estimated Value: $${info.totalTokenValueUSD.toFixed(4)} USD`);
        } else {
          console.log(`   Estimated Value: $0.0000 USD (price data unavailable)`);
        }

        // Show suspicious indicators if available
        if (info.suspiciousIndicators.length > 0) {
          console.log(`   Suspicious Indicators: ${info.suspiciousIndicators[0]}${
            info.suspiciousIndicators.length > 1 ?
            ` and ${info.suspiciousIndicators.length - 1} more` : ''}`);
        }
      }
    }

    // Display total value summary
    console.log('\nValue Summary:');
    console.log(`Total Estimated Value of Suspicious Tokens: $${totalValueUSD.toFixed(4)} USD`);
  }

  // Add recommendations section
  console.log('\n⚠️ Recommendations:');
  if (victimCount > 0) {
    console.log('1. Avoid interacting with unknown tokens received in your wallet');
    console.log('2. Consider using a burner wallet to isolate suspicious assets');
    console.log('3. Never click on links in token metadata or transaction memos');
    console.log('4. For maximum security, create a new wallet and transfer your legitimate assets there');
  } else if (attackerCount > 0) {
    console.log('1. Your wallet appears to be sending dusting transactions');
    console.log('2. If this is unintentional, your wallet may be compromised');
    console.log('3. Consider securing your wallet and reviewing recent activity');
  } else {
    console.log('1. Continue monitoring your wallet for suspicious activity');
    console.log('2. Be cautious when interacting with unknown tokens or contracts');
  }

  console.log('\n=== Analysis Complete ===');
}

module.exports = {
  analyzeWalletTokens,
  detectDustingAttacks
};
