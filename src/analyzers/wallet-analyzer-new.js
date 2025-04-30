/**
 * Wallet Analyzer for Solana Dusting Attack Detector
 *
 * This module provides functions for analyzing Solana wallets
 * to detect potential dusting attacks.
 */

const {
  getTransactionSignatures,
  makeApiRequest,
  makeRpcRequest,
  HELIUS_API_KEY
} = require('../api/api-helpers');

const { analyzeTransaction } = require('./transaction-analyzer');

/**
 * Check if a token is suspicious based on various indicators
 * @param {Object} token - The token to check
 * @returns {Object} - Object with isSuspicious flag and reasons array
 */
function checkIfTokenIsSuspicious(token) {
  const suspiciousReasons = [];

  // Check for very small token amounts (potential dusting)
  if (token.amount && parseFloat(token.amount) <= 1) {
    suspiciousReasons.push('Minimal token amount (≤1)');
  }

  // Check for unusual decimal places
  if (token.decimals && (token.decimals > 12 || token.decimals === 0)) {
    suspiciousReasons.push(`Unusual decimal places: ${token.decimals}`);
  }

  // Check token metadata for suspicious indicators
  if (token.name) {
    // Check for suspicious words in token name
    const suspiciousNameTerms = [
      'airdrop', 'claim', 'free', 'reward', 'bonus', 'support', 'verify',
      'win', 'winner', 'prize', 'gift', 'giveaway', 'promotion', 'exclusive',
      'limited', 'offer', 'official', 'verify', 'verification', 'authenticate',
      'wallet', 'connect', 'sync', 'update', 'security', 'secure'
    ];
    const name = token.name.toLowerCase();

    for (const term of suspiciousNameTerms) {
      if (name.includes(term)) {
        suspiciousReasons.push(`Name contains suspicious term: ${term}`);
        break;
      }
    }

    // Check for names similar to popular tokens
    const popularTokens = ['SOL', 'USDC', 'USDT', 'ETH', 'BTC', 'BONK', 'ORCA', 'RAY', 'SAMO', 'PYTH', 'MSOL', 'JUP'];
    const upperName = token.name.toUpperCase();
    const upperSymbol = (token.symbol || '').toUpperCase();

    for (const popularToken of popularTokens) {
      // Check for similar but not exact match in name
      if (upperName.includes(popularToken) && upperName !== popularToken) {
        suspiciousReasons.push(`Name similar to ${popularToken}`);
      }

      // Check for similar but not exact match in symbol
      if (upperSymbol.includes(popularToken) && upperSymbol !== popularToken) {
        suspiciousReasons.push(`Symbol similar to ${popularToken}`);
      }
    }

    // Check for website/URL in name or symbol
    if (name.includes('.com') || name.includes('.io') || name.includes('.org') || name.includes('http') ||
        (token.symbol && token.symbol.toLowerCase().includes('.com'))) {
      suspiciousReasons.push('Contains URL in name or symbol');
    }

    // Check for excessive length in name (often used to hide malicious intent)
    if (name.length > 30) {
      suspiciousReasons.push('Excessively long name');
    }

    // Check for unusual characters in name
    if (/[^\w\s\-.]/.test(name)) {
      suspiciousReasons.push('Contains unusual characters in name');
    }
  }

  // Check for zero or very low supply tokens
  if (token.supply && parseFloat(token.supply) < 100) {
    suspiciousReasons.push('Very low token supply');
  }

  // Check for extremely high supply (often used in scams)
  if (token.supply && parseFloat(token.supply) > 1e15) {
    suspiciousReasons.push('Extremely high token supply');
  }

  // Check for extremely low price (if available)
  if (token.priceUSD && token.priceUSD < 0.0000001) {
    suspiciousReasons.push('Extremely low token price');
  }

  return {
    isSuspicious: suspiciousReasons.length > 0,
    reasons: suspiciousReasons
  };
}

/**
 * Analyze wallet tokens for dusting
 * @param {string} walletAddress - The wallet address to analyze
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeWalletTokens(walletAddress) {
  try {
    console.log('Fetching token balances using getTokenAccountsByOwner...');

    // Use the RPC method getTokenAccountsByOwner to get token accounts
    const response = await makeRpcRequest('getTokenAccountsByOwner', [
      walletAddress,
      {
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' // SPL Token program ID
      },
      {
        encoding: 'jsonParsed'
      }
    ]);

    if (!response || !response.result || !response.result.value) {
      console.log('No token accounts found or error retrieving token data');
      return {
        allTokens: [],
        suspiciousTokens: [],
        details: 'Error retrieving token data'
      };
    }

    // Process token accounts
    const tokenAccounts = response.result.value;
    console.log(`Found ${tokenAccounts.length} token accounts`);

    // Extract token data from accounts
    let tokens = [];
    for (const account of tokenAccounts) {
      try {
        const parsedInfo = account.account.data.parsed.info;
        const tokenAmount = parsedInfo.tokenAmount;

        // Only include tokens with non-zero balance
        if (tokenAmount.uiAmount > 0) {
          tokens.push({
            address: parsedInfo.mint,
            amount: tokenAmount.uiAmount.toString(),
            decimals: tokenAmount.decimals,
            // We'll fetch name and symbol later
            name: 'Unknown',
            symbol: 'Unknown'
          });
        }
      } catch (error) {
        console.log(`Error parsing token account: ${error.message}`);
      }
    }

    // Fetch token metadata for each token
    console.log(`Fetching metadata for ${tokens.length} tokens...`);
    for (let i = 0; i < tokens.length; i++) {
      try {
        const token = tokens[i];
        // Try to get token metadata
        const { getTokenPrice } = require('../utils/token-price-fetcher');
        const tokenInfo = await getTokenPrice(token.address);

        if (tokenInfo && tokenInfo.name) {
          token.name = tokenInfo.name;
          token.symbol = tokenInfo.symbol || 'Unknown';
        }

        // Show progress
        if ((i + 1) % 5 === 0 || i === tokens.length - 1) {
          console.log(`Processed ${i + 1}/${tokens.length} tokens`);
        }
      } catch (error) {
        console.log(`Error fetching metadata for token ${tokens[i].address}: ${error.message}`);
      }
    }

    const allTokens = [];
    const suspiciousTokens = [];

    for (const token of tokens) {
      const suspiciousReasons = [];

      // Format token data for consistent structure
      const formattedToken = {
        name: token.name || 'Unknown',
        symbol: token.symbol || 'Unknown',
        mint: token.address,
        amount: token.amount,
        decimals: token.decimals,
        isSuspicious: false,
        suspiciousReasons: []
      };

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

      // Add suspicious reasons if any were found
      if (suspiciousReasons.length > 0) {
        formattedToken.isSuspicious = true;
        formattedToken.suspiciousReasons = suspiciousReasons;
        suspiciousTokens.push(formattedToken);
      }

      // Add to all tokens list
      allTokens.push(formattedToken);
    }

    return {
      totalTokens: tokens.length,
      allTokens,
      suspiciousTokens
    };
  } catch (error) {
    console.error('Error analyzing wallet tokens:', error);
    return {
      allTokens: [],
      suspiciousTokens: [],
      details: 'Error analyzing token data'
    };
  }
}

/**
 * Analyze wallet tokens as a standalone command
 * @param {string} walletAddress - The wallet address to analyze
 * @param {number} numTransactions - Number of transactions to analyze (optional)
 */
async function analyzeWalletTokensCommand(walletAddress, numTransactions = 0) {
  console.log(`\n=== Solana Wallet Token Analysis ===`);
  console.log(`Analyzing wallet: ${walletAddress}`);
  console.log('======================================\n');

  try {
    // Fetch token accounts using the exact structure provided
    console.log('Fetching token accounts...');

    const response = await fetch('https://mainnet.helius-rpc.com/?api-key=' + HELIUS_API_KEY, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTokenAccountsByOwner",
        "params": [
          walletAddress,
          {
            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          },
          {
            "encoding": "jsonParsed"
          }
        ]
      })
    });

    const data = await response.json();

    if (!data || !data.result || !data.result.value) {
      console.log('No token accounts found or error retrieving token data');
      return;
    }

    // Process token accounts
    const tokenAccounts = data.result.value;
    console.log(`Found ${tokenAccounts.length} token accounts`);

    if (tokenAccounts.length === 0) {
      console.log('No tokens found in this wallet.');
      return;
    }

    // Extract token data from accounts
    let tokens = [];
    for (const account of tokenAccounts) {
      try {
        const parsedInfo = account.account.data.parsed.info;
        const tokenAmount = parsedInfo.tokenAmount;

        // Only include tokens with non-zero balance
        if (tokenAmount.uiAmount > 0) {
          tokens.push({
            mint: parsedInfo.mint,
            amount: tokenAmount.uiAmount,
            decimals: tokenAmount.decimals,
            name: 'Unknown',
            symbol: 'Unknown'
          });
        }
      } catch (error) {
        console.log(`Error parsing token account: ${error.message}`);
      }
    }

    console.log(`Found ${tokens.length} tokens with non-zero balance in wallet.\n`);

    // Display token information
    if (tokens.length > 0) {
      console.log('\n=== Analysis Results ===');
      console.log(`\nToken Analysis:`);
      console.log(`Found ${tokens.length} total tokens in wallet`);

      // Process and display token information
      console.log(`\nAll Tokens in Wallet (${tokens.length}):`);

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Try to get token metadata using multiple sources
        try {
          console.log(`Fetching metadata for token: ${token.mint}`);

          // First try to get token metadata from Helius
          let metadata = null;
          try {
            const metadataResponse = await fetch(`https://api.helius.xyz/v0/tokens/${token.mint}?api-key=${HELIUS_API_KEY}`);
            metadata = await metadataResponse.json();

            if (metadata && metadata.name) {
              token.name = metadata.name;
              token.symbol = metadata.symbol || 'Unknown';
              console.log(`  Got metadata from Helius: ${token.name} (${token.symbol})`);
            }
          } catch (error) {
            console.log(`  Error fetching Helius metadata: ${error.message}`);
          }

          // If Helius didn't work, try token price fetcher
          if (!metadata || !metadata.name) {
            try {
              const { getTokenPrice } = require('../utils/token-price-fetcher');
              const tokenInfo = await getTokenPrice(token.mint);

              if (tokenInfo && tokenInfo.name) {
                token.name = tokenInfo.name;
                token.symbol = tokenInfo.symbol || 'Unknown';
                console.log(`  Got metadata from token price fetcher: ${token.name} (${token.symbol})`);

                // Store additional info if available
                if (tokenInfo.price && tokenInfo.price.pricePerToken) {
                  token.priceUSD = tokenInfo.price.pricePerToken;
                  token.valueUSD = token.amount * token.priceUSD;
                }
              }
            } catch (error) {
              console.log(`  Error fetching token price: ${error.message}`);
            }
          }
        } catch (error) {
          console.log(`Error fetching token info: ${error.message}`);
        }

        // Check if token is suspicious
        try {
          const isSuspicious = checkIfTokenIsSuspicious(token);
          token.isSuspicious = isSuspicious.isSuspicious;
          token.suspiciousReasons = isSuspicious.reasons;
        } catch (error) {
          console.log(`Error checking if token is suspicious: ${error.message}`);
          token.isSuspicious = false;
          token.suspiciousReasons = [];
        }

        // Display token information
        console.log(`\n${i + 1}. ${token.name || 'Unknown'} (${token.symbol || 'Unknown'})`);
        console.log(`   Mint: ${token.mint}`);
        console.log(`   Amount: ${token.amount}`);
        console.log(`   Decimals: ${token.decimals}`);

        // Show value if available
        if (token.priceUSD) {
          console.log(`   Price: $${token.priceUSD.toFixed(6)} USD`);
          console.log(`   Value: $${token.valueUSD.toFixed(2)} USD`);
        }

        // Show suspicious indicators if any
        if (token.isSuspicious) {
          console.log(`   ⚠️ Suspicious indicators: ${token.suspiciousReasons.join(', ')}`);
        }
      }
    }

    // Calculate summary statistics
    const suspiciousTokens = tokens.filter(token => token.isSuspicious);
    let totalValueUSD = 0;
    let suspiciousValueUSD = 0;

    // Calculate total value
    tokens.forEach(token => {
      if (token.valueUSD) {
        totalValueUSD += token.valueUSD;
        if (token.isSuspicious) {
          suspiciousValueUSD += token.valueUSD;
        }
      }
    });

    // Display summary
    console.log('\n=== Summary ===');
    console.log(`Total Tokens: ${tokens.length}`);
    console.log(`Suspicious Tokens: ${suspiciousTokens.length}`);

    if (totalValueUSD > 0) {
      console.log(`Total Value: $${totalValueUSD.toFixed(2)} USD`);

      if (suspiciousValueUSD > 0) {
        console.log(`Suspicious Token Value: $${suspiciousValueUSD.toFixed(2)} USD (${(suspiciousValueUSD / totalValueUSD * 100).toFixed(1)}% of total)`);
      }
    }

    // Add recommendations section
    console.log('\n⚠️ Recommendations:');
    console.log('1. Avoid interacting with unknown tokens received in your wallet');
    console.log('2. Consider using a burner wallet to isolate suspicious assets');
    console.log('3. Never click on links in token metadata or transaction memos');
    console.log('4. For maximum security, create a new wallet and transfer your legitimate assets there');

    console.log('\n=== Analysis Complete ===');
  } catch (error) {
    console.error('Error analyzing wallet tokens:', error);
  }
}

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

  // Step 2: Analyze each transaction
  console.log('Analyzing transactions for dusting attacks...');
  const analysisResults = [];
  let dustingCount = 0;

  // Process each transaction
  for (let i = 0; i < signatures.length; i++) {
    const signature = signatures[i];

    try {
      const result = await analyzeTransaction(signature);
      analysisResults.push(result);

      if (result.isDusting) {
        dustingCount++;
      }

      // Show progress
      console.log(`Analyzed ${i + 1}/${signatures.length} transactions`);
    } catch (error) {
      console.error(`Error analyzing transaction ${signature.substring(0, 8)}: ${error.message}`);
    }
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

  // Token analysis results
  console.log(`\nToken Analysis:`);
  if (tokenAnalysis.totalTokens === 0) {
    console.log('No tokens found in this wallet');
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

module.exports = {
  analyzeWalletTokens,
  analyzeWalletTokensCommand,
  detectDustingAttacks
};
