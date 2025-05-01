/**
 * Helius DAS (Digital Asset Standard) API Tester
 *
 * This script tests the Helius DAS API endpoints for NFTs and tokens on Solana.
 * Create a config.js file based on config.example.js with your API key.
 */

// Import configuration
const { HELIUS_API_KEY } = require('../config');
const DAS_API_URL = `https://api.helius.xyz/v0/tokens`;

// Helper function to make DAS API requests
async function makeDasRequest(endpoint, method = 'GET', body = null) {
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

    const url = `${DAS_API_URL}${endpoint}?api-key=${HELIUS_API_KEY}`;
    const response = await fetch(url, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making DAS API request to ${endpoint}:`, error);
    return null;
  }
}

// Test getting asset by mint address (useful for address poisoning detection)
async function testGetAsset() {
  console.log('Testing Get Asset (for address poisoning detection)...\n');

  // Example token mint addresses (replace with real ones for better testing)
  // Ideally include:
  // 1. A legitimate token (e.g., USDC, SOL)
  // 2. A suspicious token that might be used for address poisoning
  const exampleMints = [
    // Example mint (replace with a real one)
    'DsfCsbbPH77p6yeLS1i4ag9UA5gP9xWSvdCx72FJjLsx'
  ];

  for (const mint of exampleMints) {
    console.log(`\nTesting Get Asset for mint: ${mint}...`);
    const assetResponse = await makeDasRequest(`/get-asset?id=${mint}`);

    if (assetResponse && assetResponse.content) {
      // Extract important metadata for spam detection
      const metadata = assetResponse.content.metadata;

      console.log('Token Name:', metadata?.name || 'Unknown');
      console.log('Token Symbol:', metadata?.symbol || 'Unknown');

      // Check for suspicious URLs in metadata (common in address poisoning)
      if (metadata?.external_url) {
        console.log('External URL:', metadata.external_url);

        // Simple check for suspicious URLs
        const suspiciousTerms = ['airdrop', 'claim', 'free', 'reward', 'bonus', 'swap'];
        const url = metadata.external_url.toLowerCase();
        const hasSuspiciousTerm = suspiciousTerms.some(term => url.includes(term));

        if (hasSuspiciousTerm) {
          console.log('WARNING: Token has suspicious URL - potential address poisoning vector');
        }
      }

      // Check for suspicious token names (similar to popular tokens)
      if (metadata?.name) {
        const popularTokens = ['SOL', 'USDC', 'USDT', 'ETH', 'BTC', 'BONK'];
        const tokenName = metadata.name.toUpperCase();

        for (const popularToken of popularTokens) {
          if (tokenName.includes(popularToken) && tokenName !== popularToken) {
            console.log(`WARNING: Token name contains "${popularToken}" - potential address poisoning vector`);
          }
        }
      }
    }

    // Full response for reference
    console.log('\nFull Asset Response:');
    console.log(JSON.stringify(assetResponse, null, 2));
    console.log('-----------------------------------\n');
  }
}

// Test searching for assets
async function testSearchAssets() {
  console.log('Testing Search Assets...\n');

  // Example search query
  const searchQuery = {
    ownerAddress: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg',
    limit: 5
  };

  console.log(`Testing Search Assets with query: ${JSON.stringify(searchQuery)}...`);
  const searchResponse = await makeDasRequest('/search-assets', 'POST', searchQuery);

  console.log('Search Assets Response:');
  console.log(JSON.stringify(searchResponse, null, 2));
  console.log('-----------------------------------\n');
}

// Test getting assets by owner (useful for identifying potential spam tokens received)
async function testGetAssetsByOwner() {
  console.log('Testing Get Assets by Owner (for identifying received spam tokens)...\n');

  // Example owner address (replace with a real one for better testing)
  const ownerAddress = 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg';

  console.log(`Testing Get Assets by Owner for address: ${ownerAddress}...`);
  const ownerAssetsResponse = await makeDasRequest(`/get-assets-by-owner?owner=${ownerAddress}&limit=10`);

  if (ownerAssetsResponse && Array.isArray(ownerAssetsResponse)) {
    console.log(`\nFound ${ownerAssetsResponse.length} assets owned by this address`);

    // Analyze tokens for potential spam indicators
    let suspiciousTokenCount = 0;

    for (const asset of ownerAssetsResponse) {
      if (asset.content && asset.content.metadata) {
        const metadata = asset.content.metadata;
        let isSuspicious = false;
        let suspiciousReasons = [];

        // Check for suspicious token names
        if (metadata.name) {
          const popularTokens = ['SOL', 'USDC', 'USDT', 'ETH', 'BTC', 'BONK'];
          const tokenName = metadata.name.toUpperCase();

          for (const popularToken of popularTokens) {
            if (tokenName.includes(popularToken) && tokenName !== popularToken) {
              isSuspicious = true;
              suspiciousReasons.push(`Name similar to ${popularToken}`);
            }
          }
        }

        // Check for suspicious URLs
        if (metadata.external_url) {
          const suspiciousTerms = ['airdrop', 'claim', 'free', 'reward', 'bonus', 'swap'];
          const url = metadata.external_url.toLowerCase();

          for (const term of suspiciousTerms) {
            if (url.includes(term)) {
              isSuspicious = true;
              suspiciousReasons.push(`URL contains suspicious term: ${term}`);
              break;
            }
          }
        }

        // Check for very small token amounts (potential dusting)
        if (asset.ownership && asset.ownership.amount === 1) {
          isSuspicious = true;
          suspiciousReasons.push('Minimal token amount (1)');
        }

        if (isSuspicious) {
          suspiciousTokenCount++;
          console.log(`\nSuspicious Token #${suspiciousTokenCount}:`);
          console.log(`  Name: ${metadata.name || 'Unknown'}`);
          console.log(`  Symbol: ${metadata.symbol || 'Unknown'}`);
          console.log(`  Mint: ${asset.id}`);
          console.log(`  Suspicious indicators: ${suspiciousReasons.join(', ')}`);
        }
      }
    }

    console.log(`\nSummary: Found ${suspiciousTokenCount} potentially suspicious tokens out of ${ownerAssetsResponse.length} total tokens`);
  }

  // Full response for reference
  console.log('\nFull Get Assets by Owner Response:');
  console.log(JSON.stringify(ownerAssetsResponse, null, 2));
  console.log('-----------------------------------\n');
}

// Main function to run all tests
async function runTests() {
  console.log('Starting Helius DAS API Tests...\n');

  await testGetAsset();
  await testSearchAssets();
  await testGetAssetsByOwner();

  console.log('All DAS API tests completed!');
}

// Run the tests
runTests().catch(console.error);
