/**
 * Token Price Fetcher for Solana Spam Detector
 *
 * This module provides functions for fetching token prices using Helius API's getAssetBatch method.
 * It can be used to get price information for Solana tokens.
 */

const {
  HELIUS_API_KEY,
  HELIUS_RPC_URL,
  makeRpcRequest
} = require('./api-helpers');

// Simple in-memory cache for token info to avoid duplicate API calls
const tokenInfoCache = new Map();

/**
 * Make a direct RPC request to Helius with exact format from example
 * @param {Object} params - The request parameters
 * @returns {Promise<Object>} - The response from the RPC call
 */
async function makeDirectRpcRequest(params) {
  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test',
        method: 'getAssetBatch',
        params: params
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making direct RPC request:`, error);
    return null;
  }
}

/**
 * Fetch token price and metadata using Helius getAssetBatch method
 * @param {string} tokenMint - The token mint address
 * @param {boolean} forceRefresh - Whether to force a refresh from the API
 * @returns {Promise<Object>} - Token price and metadata information
 */
async function getTokenPrice(tokenMint, forceRefresh = false) {
  try {
    // Check cache first
    if (!forceRefresh && tokenInfoCache.has(tokenMint)) {
      return tokenInfoCache.get(tokenMint);
    }

    console.log(`Fetching price and metadata for token: ${tokenMint}`);

    // Use the direct RPC request with exact format from example
    const params = {
      ids: [tokenMint]
    };

    const response = await makeDirectRpcRequest(params);

    // For debugging, log the response in verbose mode only
    if (process.env.DEBUG) {
      console.log('API Response:', JSON.stringify(response, null, 2));
    }

    if (!response || !response.result || !response.result[0]) {
      console.log('No data returned from getAssetBatch');
      return null;
    }

    const asset = response.result[0];

    // Extract token information
    const tokenInfo = {
      mint: tokenMint,
      interface: asset.interface,
      name: asset.content?.metadata?.name || 'Unknown',
      symbol: asset.content?.metadata?.symbol || 'Unknown',
      decimals: asset.token_info?.decimals || 0,
      supply: asset.token_info?.supply || null,
      description: asset.content?.metadata?.description || null,
      attributes: asset.content?.metadata?.attributes || [],
      links: asset.content?.links || {},
      creators: asset.creators || []
    };

    // Extract price information if available
    if (asset.token_info?.price_info) {
      tokenInfo.price = {
        pricePerToken: asset.token_info.price_info.price_per_token,
        currency: asset.token_info.price_info.currency,
        lastUpdated: new Date().toISOString()
      };
    } else {
      tokenInfo.price = null;
    }

    // Add scam detection analysis
    tokenInfo.scamAnalysis = analyzeTokenForScamIndicators(asset);

    // Cache the result
    tokenInfoCache.set(tokenMint, tokenInfo);

    return tokenInfo;
  } catch (error) {
    console.error(`Error fetching token price for ${tokenMint}:`, error);
    return null;
  }
}

/**
 * Analyze token metadata for scam indicators
 * @param {Object} asset - The token asset data from Helius
 * @returns {Object} - Analysis results with scam indicators and score
 */
function analyzeTokenForScamIndicators(asset) {
  const analysis = {
    suspiciousIndicators: [],
    scamScore: 0,
    isLikelyScam: false,
    recommendedDustThreshold: 1 // Default dust threshold
  };

  // Extract relevant data
  const name = asset.content?.metadata?.name || '';
  const symbol = asset.content?.metadata?.symbol || '';
  const description = asset.content?.metadata?.description || '';
  const supply = asset.token_info?.supply || 0;
  const attributes = asset.content?.metadata?.attributes || [];
  const links = asset.content?.links || {};

  // 1. Check for impersonation of popular tokens
  const popularTokens = [
    { name: 'Solana', symbol: 'SOL' },
    { name: 'USD Coin', symbol: 'USDC' },
    { name: 'Tether', symbol: 'USDT' },
    { name: 'Bitcoin', symbol: 'BTC' },
    { name: 'Ethereum', symbol: 'ETH' },
    { name: 'Bonk', symbol: 'BONK' }
  ];

  for (const popularToken of popularTokens) {
    // Check for similar name but not exact match
    if (name.toLowerCase().includes(popularToken.name.toLowerCase()) &&
        name.toLowerCase() !== popularToken.name.toLowerCase()) {
      analysis.suspiciousIndicators.push(`Name similar to ${popularToken.name}`);
      analysis.scamScore += 20;
    }

    // Check for symbol impersonation
    if (symbol === popularToken.symbol &&
        name.toLowerCase() !== popularToken.name.toLowerCase()) {
      analysis.suspiciousIndicators.push(`Using symbol ${popularToken.symbol} but not the official ${popularToken.name}`);
      analysis.scamScore += 30;
    }
  }

  // 2. Check for suspicious terms in name
  const suspiciousNameTerms = ['.com', '.io', '.org', '.net', 'http', 'www', 'airdrop', 'free', 'claim'];
  for (const term of suspiciousNameTerms) {
    if (name.toLowerCase().includes(term)) {
      analysis.suspiciousIndicators.push(`Name contains suspicious term: ${term}`);
      analysis.scamScore += 15;
    }
  }

  // 3. Check for suspicious description
  const suspiciousDescTerms = [
    'airdrop', 'claim', 'free', 'winner', 'reward', 'bonus', 'giveaway',
    'limited', 'exclusive', 'congratulations', 'selected', 'promo', 'promotion',
    'offer', 'discount', 'special', 'gift', 'prize', 'won', 'earn', 'profit'
  ];

  let descSuspiciousTermCount = 0;
  for (const term of suspiciousDescTerms) {
    if (description && description.toLowerCase().includes(term)) {
      descSuspiciousTermCount++;
    }
  }

  if (descSuspiciousTermCount > 0) {
    analysis.suspiciousIndicators.push(`Description contains ${descSuspiciousTermCount} suspicious terms`);
    analysis.scamScore += 5 * descSuspiciousTermCount;
  }

  // 4. Check for URLs in description
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|io|org|net|xyz|app))/gi;
  const urlMatches = description ? description.match(urlRegex) : null;

  if (urlMatches && urlMatches.length > 0) {
    analysis.suspiciousIndicators.push(`Description contains ${urlMatches.length} URLs`);
    analysis.scamScore += 25;
  }

  // 5. Check for suspicious attributes
  for (const attr of attributes) {
    // Check for links in attributes
    if (attr.trait_type === 'Link' || attr.trait_type === 'Website' || attr.trait_type === 'URL') {
      analysis.suspiciousIndicators.push(`Contains link attribute: ${attr.value}`);
      analysis.scamScore += 15;
    }

    // Check for suspicious claims in attributes
    if (attr.value && typeof attr.value === 'string') {
      const lowerValue = attr.value.toLowerCase();
      if (lowerValue.includes('airdrop') || lowerValue.includes('free') ||
          lowerValue.includes('claim') || lowerValue.includes('reward')) {
        analysis.suspiciousIndicators.push(`Suspicious attribute: ${attr.trait_type} = ${attr.value}`);
        analysis.scamScore += 20;
      }
    }
  }

  // 6. Check supply (very low supply might be suspicious)
  if (supply && supply < 1000) {
    analysis.suspiciousIndicators.push(`Very low token supply: ${supply}`);
    analysis.scamScore += 10;
  }

  // 7. Determine if it's likely a scam based on score
  if (analysis.scamScore >= 50) {
    analysis.isLikelyScam = true;
  }

  // 8. Set recommended dust threshold based on analysis
  // For likely scam tokens, any amount should be considered dust
  // For legitimate tokens, use a value-based approach
  if (analysis.isLikelyScam) {
    analysis.recommendedDustThreshold = 999999; // Any amount is suspicious
  } else if (analysis.scamScore >= 30) {
    analysis.recommendedDustThreshold = 10; // More conservative threshold
  } else if (analysis.scamScore >= 15) {
    analysis.recommendedDustThreshold = 5; // Moderate threshold
  } else {
    analysis.recommendedDustThreshold = 1; // Default threshold
  }

  return analysis;
}

/**
 * Fetch prices for multiple tokens using Helius getAssetBatch method
 * @param {Array<string>} tokenMints - Array of token mint addresses
 * @param {boolean} forceRefresh - Whether to force a refresh from the API
 * @returns {Promise<Object>} - Map of token mint addresses to price information
 */
async function getMultipleTokenPrices(tokenMints, forceRefresh = false) {
  try {
    // Filter out tokens that are already in cache (unless forceRefresh is true)
    let tokensToFetch = tokenMints;
    const results = {};

    if (!forceRefresh) {
      // Add cached tokens to results
      for (const mint of tokenMints) {
        if (tokenInfoCache.has(mint)) {
          results[mint] = tokenInfoCache.get(mint);
        }
      }

      // Only fetch tokens not in cache
      tokensToFetch = tokenMints.filter(mint => !tokenInfoCache.has(mint));

      // If all tokens are in cache, return early
      if (tokensToFetch.length === 0) {
        return results;
      }
    }

    console.log(`Fetching prices for ${tokensToFetch.length} tokens`);

    // Process in batches of 100 (API limitation)
    const batchSize = 100;

    for (let i = 0; i < tokensToFetch.length; i += batchSize) {
      const batch = tokensToFetch.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} (${batch.length} tokens)`);

      // Use the direct RPC request with exact format from example
      const params = {
        ids: batch
      };

      const response = await makeDirectRpcRequest(params);

      if (!response || !response.result) {
        console.log(`No data returned for batch ${Math.floor(i/batchSize) + 1}`);
        continue;
      }

      // Process each asset in the batch
      for (const asset of response.result) {
        if (!asset) continue;

        const tokenMint = asset.id;

        // Extract token information
        const tokenInfo = {
          mint: tokenMint,
          interface: asset.interface,
          name: asset.content?.metadata?.name || 'Unknown',
          symbol: asset.content?.metadata?.symbol || 'Unknown',
          decimals: asset.token_info?.decimals || 0,
          supply: asset.token_info?.supply || null,
          description: asset.content?.metadata?.description || null,
          attributes: asset.content?.metadata?.attributes || [],
          links: asset.content?.links || {},
          creators: asset.creators || []
        };

        // Extract price information if available
        if (asset.token_info?.price_info) {
          tokenInfo.price = {
            pricePerToken: asset.token_info.price_info.price_per_token,
            currency: asset.token_info.price_info.currency,
            lastUpdated: new Date().toISOString()
          };
        } else {
          tokenInfo.price = null;
        }

        // Add scam detection analysis
        tokenInfo.scamAnalysis = analyzeTokenForScamIndicators(asset);

        // Cache the result
        tokenInfoCache.set(tokenMint, tokenInfo);

        results[tokenMint] = tokenInfo;
      }
    }

    return results;
  } catch (error) {
    console.error(`Error fetching multiple token prices:`, error);
    return results; // Return whatever we have
  }
}

/**
 * Calculate token value in USD and assess dusting risk
 * @param {string} tokenMint - The token mint address
 * @param {number} amount - The token amount
 * @returns {Promise<Object>} - Value information and dusting risk assessment
 */
async function calculateTokenValue(tokenMint, amount) {
  try {
    const tokenInfo = await getTokenPrice(tokenMint);

    // Default result with no price information
    const baseResult = {
      tokenMint,
      amount,
      valueUSD: null,
      isDust: false,
      dustingRisk: 'UNKNOWN',
      message: 'Price information not available'
    };

    // If we couldn't get token info, return basic result
    if (!tokenInfo) {
      return baseResult;
    }

    // Add token metadata to result
    baseResult.tokenName = tokenInfo.name;
    baseResult.tokenSymbol = tokenInfo.symbol;
    baseResult.decimals = tokenInfo.decimals || 0;

    // Add scam analysis if available
    if (tokenInfo.scamAnalysis) {
      baseResult.scamScore = tokenInfo.scamAnalysis.scamScore;
      baseResult.suspiciousIndicators = tokenInfo.scamAnalysis.suspiciousIndicators;
      baseResult.isLikelyScam = tokenInfo.scamAnalysis.isLikelyScam;
    }

    // Calculate normalized amount (accounting for decimals)
    const decimals = tokenInfo.decimals || 0;
    const normalizedAmount = amount / Math.pow(10, decimals);
    baseResult.normalizedAmount = normalizedAmount;

    // If we have price information, calculate USD value
    if (tokenInfo.price) {
      const valueUSD = normalizedAmount * tokenInfo.price.pricePerToken;
      baseResult.valueUSD = valueUSD;
      baseResult.pricePerToken = tokenInfo.price.pricePerToken;
      baseResult.currency = tokenInfo.price.currency;
      baseResult.message = 'Value calculated successfully';

      // Determine if this is dust based on value and scam analysis
      // For high-value tokens, even small amounts might not be dust
      // For likely scam tokens, even larger amounts might be dust

      // Value-based dust detection
      if (valueUSD < 0.10) {
        // Less than 10 cents is generally considered dust
        baseResult.isDust = true;
        baseResult.dustingRisk = 'HIGH';
        baseResult.dustReason = `Very low value (${valueUSD.toFixed(4)} USD)`;
      } else if (valueUSD < 1.0) {
        // Between 10 cents and $1 might be dust depending on context
        baseResult.isDust = tokenInfo.scamAnalysis?.isLikelyScam || false;
        baseResult.dustingRisk = tokenInfo.scamAnalysis?.isLikelyScam ? 'HIGH' : 'MEDIUM';
        baseResult.dustReason = `Low value (${valueUSD.toFixed(2)} USD)`;
      } else {
        // Over $1 is generally not dust unless it's a scam token
        baseResult.isDust = false;
        baseResult.dustingRisk = tokenInfo.scamAnalysis?.isLikelyScam ? 'MEDIUM' : 'LOW';
        baseResult.dustReason = `Significant value (${valueUSD.toFixed(2)} USD)`;
      }
    } else {
      // No price info, use amount-based and metadata-based detection

      // Get recommended dust threshold from scam analysis
      const dustThreshold = tokenInfo.scamAnalysis?.recommendedDustThreshold || 1;

      if (normalizedAmount <= dustThreshold) {
        baseResult.isDust = true;

        if (tokenInfo.scamAnalysis?.isLikelyScam) {
          baseResult.dustingRisk = 'VERY_HIGH';
          baseResult.dustReason = `Small amount (${normalizedAmount}) of likely scam token`;
        } else {
          baseResult.dustingRisk = 'MEDIUM';
          baseResult.dustReason = `Small amount (${normalizedAmount}) with no price data`;
        }
      } else {
        baseResult.isDust = tokenInfo.scamAnalysis?.isLikelyScam || false;
        baseResult.dustingRisk = tokenInfo.scamAnalysis?.isLikelyScam ? 'HIGH' : 'LOW';
        baseResult.dustReason = tokenInfo.scamAnalysis?.isLikelyScam ?
          'Likely scam token regardless of amount' :
          `Larger amount (${normalizedAmount}) with no price data`;
      }
    }

    return baseResult;
  } catch (error) {
    console.error(`Error calculating token value for ${tokenMint}:`, error);
    return {
      tokenMint,
      amount,
      valueUSD: null,
      isDust: false,
      dustingRisk: 'UNKNOWN',
      message: `Error calculating value: ${error.message}`
    };
  }
}

// If this script is run directly, execute the example
if (require.main === module) {
  // Example token mints to test
  const exampleTokens = [
    '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN', // TRUMP token from example
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'So11111111111111111111111111111111111111112'   // Wrapped SOL
  ];

  // Test single token price fetch
  async function testSingleToken() {
    console.log('\n=== Testing Single Token Price Fetch ===');
    const trumpToken = exampleTokens[0];
    const tokenInfo = await getTokenPrice(trumpToken);
    console.log(JSON.stringify(tokenInfo, null, 2));

    // Test value calculation
    if (tokenInfo && tokenInfo.price) {
      console.log('\n=== Testing Token Value Calculation ===');
      const valueInfo = await calculateTokenValue(trumpToken, 1000000); // 1 TRUMP (assuming 6 decimals)
      console.log(JSON.stringify(valueInfo, null, 2));
    }
  }

  // Test multiple token price fetch
  async function testMultipleTokens() {
    console.log('\n=== Testing Multiple Token Price Fetch ===');
    const tokenInfoMap = await getMultipleTokenPrices(exampleTokens);
    console.log(JSON.stringify(tokenInfoMap, null, 2));
  }

  // Run tests
  async function runTests() {
    await testSingleToken();
    await testMultipleTokens();
  }

  runTests().catch(console.error);
}

module.exports = {
  getTokenPrice,
  getMultipleTokenPrices,
  calculateTokenValue,
  makeDirectRpcRequest
};
