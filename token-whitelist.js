/**
 * Token Whitelist for Solana Dusting Attack Detector
 *
 * This module provides functions for checking if tokens are verified
 * to avoid false positives in dusting attack detection.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Cache file path for storing verified tokens
const CACHE_FILE_PATH = path.join(__dirname, 'verified-tokens-cache.json');

// Well-known stablecoins that should never be flagged as dusting attacks
const STABLECOIN_MINTS = [
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ', // DUST
  'So11111111111111111111111111111111111111112',  // Wrapped SOL
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // Bonk
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', // Raydium
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'   // Marinade Staked SOL
];

// In-memory cache for verified tokens
let verifiedTokensCache = null;
let cacheLastUpdated = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Load verified tokens from cache file
 * @returns {Object|null} Cached verified tokens or null if cache doesn't exist
 */
function loadCachedVerifiedTokens() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8'));
      console.log(`Loaded ${Object.keys(cacheData.tokens).length} verified tokens from cache`);
      return cacheData;
    }
  } catch (error) {
    console.error('Error loading verified tokens cache:', error);
  }
  return null;
}

/**
 * Save verified tokens to cache file
 * @param {Object} tokens - Map of token addresses to verification status
 */
function saveVerifiedTokensCache(tokens) {
  try {
    const cacheData = {
      lastUpdated: Date.now(),
      tokens
    };
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2));
    console.log(`Saved ${Object.keys(tokens).length} verified tokens to cache`);
  } catch (error) {
    console.error('Error saving verified tokens cache:', error);
  }
}

/**
 * Fetch verified tokens from Solana's token list
 * @returns {Promise<Object>} Map of token addresses to verification status
 */
async function fetchVerifiedTokens() {
  try {
    console.log('Fetching verified tokens from Solana Labs Token List...');
    const response = await axios.get(
      'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json'
    );
    
    const verifiedTokens = {};
    
    // Add all tokens from the Solana token list
    if (response.data && response.data.tokens) {
      response.data.tokens.forEach(token => {
        verifiedTokens[token.address] = {
          name: token.name,
          symbol: token.symbol,
          verified: true
        };
      });
    }
    
    // Add well-known stablecoins if they're not already in the list
    STABLECOIN_MINTS.forEach(mint => {
      if (!verifiedTokens[mint]) {
        verifiedTokens[mint] = {
          verified: true,
          isStablecoin: true
        };
      } else {
        verifiedTokens[mint].isStablecoin = true;
      }
    });
    
    console.log(`Fetched ${Object.keys(verifiedTokens).length} verified tokens`);
    return verifiedTokens;
  } catch (error) {
    console.error('Error fetching verified tokens:', error);
    
    // If fetch fails, return a map with just the well-known stablecoins
    const fallbackTokens = {};
    STABLECOIN_MINTS.forEach(mint => {
      fallbackTokens[mint] = {
        verified: true,
        isStablecoin: true
      };
    });
    
    return fallbackTokens;
  }
}

/**
 * Check if a token is verified
 * @param {string} mintAddress - The token mint address to check
 * @returns {Promise<boolean>} Whether the token is verified
 */
async function isVerifiedToken(mintAddress) {
  // Quick check for well-known stablecoins
  if (STABLECOIN_MINTS.includes(mintAddress)) {
    return true;
  }
  
  // Check if we need to refresh the cache
  const now = Date.now();
  if (!verifiedTokensCache || now - cacheLastUpdated > CACHE_TTL) {
    // Try to load from file cache first
    const fileCache = loadCachedVerifiedTokens();
    
    if (fileCache && now - fileCache.lastUpdated < CACHE_TTL) {
      verifiedTokensCache = fileCache.tokens;
      cacheLastUpdated = fileCache.lastUpdated;
    } else {
      // Fetch fresh data if file cache is missing or expired
      verifiedTokensCache = await fetchVerifiedTokens();
      cacheLastUpdated = now;
      saveVerifiedTokensCache(verifiedTokensCache);
    }
  }
  
  return verifiedTokensCache[mintAddress]?.verified || false;
}

/**
 * Check if a token is a stablecoin
 * @param {string} mintAddress - The token mint address to check
 * @returns {Promise<boolean>} Whether the token is a stablecoin
 */
async function isStablecoin(mintAddress) {
  // Quick check for well-known stablecoins
  if (STABLECOIN_MINTS.includes(mintAddress)) {
    return true;
  }
  
  // Ensure the verified tokens cache is loaded
  await isVerifiedToken(mintAddress);
  
  return verifiedTokensCache[mintAddress]?.isStablecoin || false;
}

module.exports = {
  isVerifiedToken,
  isStablecoin,
  STABLECOIN_MINTS
};
