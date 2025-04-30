/**
 * Token Analyzer for Solana Dusting Attack Detector
 *
 * This module provides functions for analyzing Solana tokens
 * to detect potential dusting attacks.
 */

const {
  makeRpcRequest,
  makeApiRequest,
  makePublicRpcRequest,
  makeExplorerRequest,
  HELIUS_API_URL,
  HELIUS_API_KEY
} = require('./api-helpers');

const { analyzeTransaction } = require('./transaction-analyzer');
const { isVerifiedToken, isStablecoin } = require('./token-whitelist');

// Logging configuration
const VERBOSE_LOGGING = false; // Set to false for clean output

/**
 * Controlled logging function that only outputs when verbose mode is enabled
 * @param {string} message - Message to log
 * @param {boolean} alwaysShow - Whether to show this message even in non-verbose mode
 */
function log(message, alwaysShow = false) {
  if (VERBOSE_LOGGING || alwaysShow) {
    console.log(message);
  }
}

/**
 * Analyze a token mint address
 * @param {string} tokenMint - The token mint address to analyze
 * @param {number} maxTransactions - Maximum number of transactions to analyze
 */
async function analyzeTokenMint(tokenMint, maxTransactions = 50) {
  log(`\n=== Solana Token Analysis ===`, true);
  log(`Analyzing token mint: ${tokenMint}`, true);
  log(`Maximum transactions to analyze: ${maxTransactions}`, true);
  log('======================================\n', true);

  try {
    // Get basic token metadata
    log('Fetching token metadata...');
    let tokenMetadata = null;

    // Try to get token metadata from Helius
    try {
      tokenMetadata = await makeApiRequest(`/tokens/${tokenMint}`);
    } catch (error) {
      log('Error fetching token metadata from Helius API');
    }

    // If that fails, try the token supply endpoint
    if (!tokenMetadata || Object.keys(tokenMetadata).length === 0) {
      try {
        const metadataResponse = await makeRpcRequest('getTokenSupply', [tokenMint]);
        if (metadataResponse && metadataResponse.result) {
          tokenMetadata = {
            decimals: metadataResponse.result.value.decimals,
            supply: metadataResponse.result.value.uiAmount
          };
        }
      } catch (error) {
        log('Error fetching token supply');
      }
    }

    // Check if this is a verified token or stablecoin
    const isTokenVerified = await isVerifiedToken(tokenMint);
    const isTokenStablecoin = await isStablecoin(tokenMint);

    // If it's a verified token but we don't have metadata, add basic verification info
    if (isTokenVerified && (!tokenMetadata || Object.keys(tokenMetadata).length === 0)) {
      tokenMetadata = tokenMetadata || {};
      tokenMetadata.isVerified = true;

      if (isTokenStablecoin) {
        tokenMetadata.isStablecoin = true;
      }
    }

    // Special case for USDC
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

    // Display token metadata if available
    if (tokenMetadata && Object.keys(tokenMetadata).length > 0) {
      log('\nToken Information:', true);
      log(`Name: ${tokenMetadata.name || 'Unknown'}`, true);
      log(`Symbol: ${tokenMetadata.symbol || 'Unknown'}`, true);
      log(`Decimals: ${tokenMetadata.decimals || 'Unknown'}`, true);
      log(`Supply: ${tokenMetadata.supply || 'Unknown'}`, true);

      if (tokenMetadata.isVerified) {
        log(`Verified: Yes`, true);
      }

      if (tokenMetadata.isStablecoin) {
        log(`Stablecoin: Yes`, true);
      }

      if (tokenMetadata.description) {
        log(`Description: ${tokenMetadata.description}`, true);
      }
    } else {
      log('\nToken Information:', true);
      log('Could not retrieve detailed token metadata', true);

      // Still show verification status if we know it
      if (isTokenVerified) {
        log(`Verified: Yes`, true);
      }

      if (isTokenStablecoin) {
        log(`Stablecoin: Yes`, true);
      }
    }

    // Improved approach to get token transactions
    log('\nFetching transactions involving this token...', true);

    // Array to store transaction signatures
    let uniqueSignatures = [];
    let fetchMethod = '';

    // Method 1: Try Helius token-transfers endpoint (best option)
    try {
      log('Using Helius token-transfers endpoint...');
      const url = `${HELIUS_API_URL}/token-transfers?api-key=${HELIUS_API_KEY}&mint=${tokenMint}&limit=${maxTransactions}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.transfers && data.transfers.length > 0) {
        uniqueSignatures = data.transfers.map(transfer => transfer.signature);
        fetchMethod = 'Helius token-transfers endpoint';
      }
    } catch (error) {
      log(`Error using Helius token-transfers endpoint: ${error.message}`);
    }

    // Method 2: If Method 1 fails, try getting signatures directly for the token mint
    if (uniqueSignatures.length === 0) {
      try {
        log('Trying to get signatures directly for the token mint...');
        const signaturesResponse = await makeRpcRequest('getSignaturesForAddress', [
          tokenMint,
          { limit: maxTransactions }
        ]);

        if (signaturesResponse && signaturesResponse.result && signaturesResponse.result.length > 0) {
          uniqueSignatures = signaturesResponse.result.map(item => item.signature);
          fetchMethod = 'direct token mint signatures';
        }
      } catch (error) {
        log(`Error getting signatures for token mint: ${error.message}`);
      }
    }

    // Method 3: If Methods 1 and 2 fail, try Helius enhanced API for transactions
    if (uniqueSignatures.length === 0) {
      try {
        log('Trying Helius enhanced API for transactions...');
        const response = await makeApiRequest('/transactions', 'POST', {
          query: {
            limit: maxTransactions,
            tokenMints: [tokenMint]
          }
        });

        if (response && Array.isArray(response) && response.length > 0) {
          uniqueSignatures = response.map(tx => tx.signature);
          fetchMethod = 'Helius enhanced API';
        }
      } catch (error) {
        log(`Error with Helius enhanced API: ${error.message}`);
      }
    }

    // Method 4: If all previous methods fail, try Solana Explorer API (especially for USDC)
    if (uniqueSignatures.length === 0) {
      try {
        log('Trying Solana Explorer API...');
        const explorerResponse = await makeExplorerRequest('/tokens/transfers', {
          limit: maxTransactions,
          offset: 0,
          mint: tokenMint
        });

        if (explorerResponse && explorerResponse.data && explorerResponse.data.length > 0) {
          uniqueSignatures = explorerResponse.data.map(item => item.signature);
          fetchMethod = 'Solana Explorer API';
        }
      } catch (error) {
        log(`Error with Solana Explorer API: ${error.message}`);
      }
    }

    // Method 5: Last resort - try to find token accounts and get their transactions
    if (uniqueSignatures.length === 0) {
      log('Trying to find token accounts as last resort...');

      try {
        // Get token accounts
        const accountsResponse = await makeRpcRequest('getTokenLargestAccounts', [tokenMint]);

        if (accountsResponse && accountsResponse.result && accountsResponse.result.value && accountsResponse.result.value.length > 0) {
          // Get the top 3 accounts by balance
          const tokenAccounts = accountsResponse.result.value.slice(0, 3).map(a => a.address);
          log(`Found ${tokenAccounts.length} token accounts. Fetching their transactions...`);

          // Get transactions for these accounts
          let allSignatures = [];
          for (const account of tokenAccounts) {
            try {
              const txResponse = await makeRpcRequest('getSignaturesForAddress', [
                account,
                { limit: Math.ceil(maxTransactions / tokenAccounts.length) }
              ]);

              if (txResponse && txResponse.result) {
                allSignatures = allSignatures.concat(txResponse.result.map(tx => tx.signature));
              }
            } catch (error) {
              log(`Error fetching transactions for account ${account}`);
            }
          }

          // Deduplicate and limit signatures
          uniqueSignatures = [...new Set(allSignatures)].slice(0, maxTransactions);
          fetchMethod = 'token accounts';
        }
      } catch (error) {
        log(`Error finding token accounts: ${error.message}`);
      }
    }

    // Show transaction fetch results
    if (uniqueSignatures.length > 0) {
      log(`Found ${uniqueSignatures.length} transactions via ${fetchMethod}`, true);
    } else {
      log(`No transactions found for this token`, true);
    }

    // Limit to the requested number of transactions
    uniqueSignatures = uniqueSignatures.slice(0, maxTransactions);

    // Final check if we have any transactions
    if (uniqueSignatures.length === 0) {
      log('\nNo transactions found for this token.', true);
      log('\n=== Analysis Results ===', true);
      log(`\nToken Analysis for ${tokenMetadata?.symbol || tokenMint}:`, true);
      log('No transactions available for analysis', true);
      log('\n=== Analysis Complete ===', true);
      return;
    }

    // Analyze each transaction
    const analysisResults = [];
    let dustingCount = 0;

    log('\nAnalyzing transactions...', true);

    for (const signature of uniqueSignatures) {
      // Pass true for isTokenTransaction to use public RPC first for token transactions
      // Also pass the tokenMint to filter transfers by this specific token
      const result = await analyzeTransaction(signature, true, tokenMint);
      analysisResults.push(result);

      if (result.isDusting) {
        dustingCount++;
      }

      // Show progress only in verbose mode
      if (VERBOSE_LOGGING) {
        process.stdout.write(`Analyzed ${analysisResults.length}/${uniqueSignatures.length} transactions\r`);
      }
    }

    // Clear the progress line
    if (VERBOSE_LOGGING) {
      process.stdout.write(' '.repeat(50) + '\r');
    }

    log(`Completed analysis of ${analysisResults.length} transactions`, true);

    // Display results
    log('\n=== Analysis Results ===', true);
    log(`\nToken Analysis for ${tokenMetadata?.symbol || tokenMint}:`, true);
    log(`Analyzed ${analysisResults.length} transactions involving this token`, true);

    if (analysisResults.length > 0) {
      const dustingPercentage = (dustingCount / analysisResults.length) * 100;
      log(`Found ${dustingCount} potential dusting attacks (${dustingPercentage.toFixed(2)}% of transactions)`, true);

      // More nuanced assessment of dusting likelihood
      let dustingAssessment;

      if (dustingPercentage >= 50) {
        dustingAssessment = 'FREQUENTLY';
      } else if (dustingPercentage >= 20) {
        dustingAssessment = 'COMMONLY';
      } else if (dustingPercentage >= 5) {
        dustingAssessment = 'SOMETIMES';
      } else if (dustingPercentage > 0) {
        dustingAssessment = 'RARELY';
      } else {
        dustingAssessment = 'NOT';
      }

      // For verified tokens, we're more cautious with the assessment
      if (tokenMetadata && tokenMetadata.isVerified) {
        log(`\nAssessment: This is a verified token (${tokenMetadata.symbol || 'Unknown'}) and is ${dustingAssessment} used for dusting attacks`, true);
      } else {
        // For unverified tokens, provide a more direct risk assessment
        let riskLevel;
        if (dustingPercentage >= 50) {
          riskLevel = 'HIGH RISK - VERY LIKELY';
        } else if (dustingPercentage >= 20) {
          riskLevel = 'MEDIUM RISK - LIKELY';
        } else if (dustingPercentage >= 5) {
          riskLevel = 'LOW RISK - POSSIBLE';
        } else if (dustingPercentage > 0) {
          riskLevel = 'VERY LOW RISK - UNLIKELY';
        } else {
          riskLevel = 'NO RISK DETECTED - VERY UNLIKELY';
        }

        log(`\nAssessment: This token is ${riskLevel} to be used for dusting attacks`, true);
      }

      if (dustingCount > 0 && VERBOSE_LOGGING) {
        log('\nPotential Dusting Attacks:', true);
        // Only show detailed transaction info in verbose mode
        const transactionsToShow = analysisResults.filter(r => r.isDusting).slice(0, 3); // Limit to 3 examples

        transactionsToShow.forEach((result, index) => {
          log(`\n${index + 1}. Transaction: ${result.signature.substring(0, 16)}...`, true);

          // Display transaction type with better description
          let typeDisplay = result.type;
          if (result.type === 'UNKNOWN') {
            // Try to use the attack vector to provide more context
            if (result.primaryAttackVector === 'SOL_DUST') {
              typeDisplay = 'SOL_TRANSFER';
            } else if (result.primaryAttackVector === 'TOKEN_DUST') {
              typeDisplay = 'TOKEN_TRANSFER';
            } else if (result.primaryAttackVector === 'MIXED_DUST') {
              typeDisplay = 'MIXED_TRANSFER';
            }
          }
          log(`   Type: ${typeDisplay}`, true);

          log(`   Attack Vector: ${result.primaryAttackVector || 'UNKNOWN'}`, true);
          log(`   Description: ${result.description}`, true);
          log(`   Timestamp: ${new Date(result.timestamp * 1000).toLocaleString()}`, true);

          // Display sender/receiver information for the first few indicators
          if (result.dustingIndicators && result.dustingIndicators.length > 0) {
            const transferIndicators = result.dustingIndicators.filter(
              i => i.type === 'native' || i.type === 'token'
            ).slice(0, 2); // Show at most 2 transfers

            if (transferIndicators.length > 0) {
              log('   Transfer Details:', true);
              transferIndicators.forEach((indicator, i) => {
                // Format addresses, handling the 'Unknown' case
                const formatAddress = (address) => {
                  if (!address || address === 'Unknown') return 'Unknown';
                  return address.substring(0, 8) + '...' + address.substring(address.length - 4);
                };

                const fromAddr = formatAddress(indicator.from);
                const toAddr = formatAddress(indicator.to);

                if (indicator.type === 'native') {
                  log(`     - ${fromAddr} → ${toAddr} (${indicator.amount} SOL)`, true);
                } else if (indicator.type === 'token') {
                  log(`     - ${fromAddr} → ${toAddr} (${indicator.amount} tokens)`, true);
                }
              });
            }
          }
        });
      }
    } else {
      log('No valid transactions could be analyzed', true);
      log('\nAssessment: Unable to determine if this token is used for dusting attacks due to insufficient data', true);
    }

    log('\n=== Analysis Complete ===', true);
  } catch (error) {
    console.error('Error analyzing token mint:', error);
    log('\n=== Analysis Results ===', true);
    log('\nAn error occurred while analyzing this token', true);
    log('This may be due to API rate limits or an invalid token address', true);
    log('\n=== Analysis Complete ===', true);
  }
}

module.exports = {
  analyzeTokenMint
};
