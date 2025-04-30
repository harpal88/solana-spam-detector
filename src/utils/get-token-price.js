/**
 * Command-line interface for fetching Solana token prices
 *
 * Usage:
 * node get-token-price.js <token-mint-address>
 * node get-token-price.js <token-mint-address> <token-amount>
 * node get-token-price.js --multiple <token-mint-address-1>,<token-mint-address-2>,...
 */

const { getTokenPrice, calculateTokenValue, getMultipleTokenPrices } = require('./token-price-fetcher');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(`
Usage:
  1. Get token price: node get-token-price.js <token-mint-address>
  2. Calculate token value: node get-token-price.js <token-mint-address> <token-amount>
  3. Get multiple token prices: node get-token-price.js --multiple <token-mint-address-1>,<token-mint-address-2>,...

Examples:
  node get-token-price.js 6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN
  node get-token-price.js EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 1000000
  node get-token-price.js --multiple 6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
  `);
  process.exit(1);
}

async function main() {
  try {
    // Check if we're fetching multiple tokens
    if (args[0] === '--multiple') {
      if (args.length < 2) {
        console.error('Error: No token mint addresses provided');
        process.exit(1);
      }

      const tokenMints = args[1].split(',');
      console.log(`Fetching prices for ${tokenMints.length} tokens...`);

      const results = await getMultipleTokenPrices(tokenMints);

      console.log('\n=== Token Price Results ===');
      for (const [mint, info] of Object.entries(results)) {
        console.log(`\nToken: ${info.name} (${info.symbol})`);
        console.log(`Mint: ${mint}`);

        if (info.price) {
          console.log(`Price: ${info.price.pricePerToken} ${info.price.currency}`);
        } else {
          console.log('Price: Not available');
        }

        // Show scam analysis summary
        if (info.scamAnalysis) {
          console.log(`Scam Score: ${info.scamAnalysis.scamScore}`);
          console.log(`Likely Scam: ${info.scamAnalysis.isLikelyScam ? 'YES' : 'NO'}`);

          if (info.scamAnalysis.suspiciousIndicators.length > 0) {
            console.log(`Suspicious Indicators: ${info.scamAnalysis.suspiciousIndicators.length}`);
          }
        }
      }
    }
    // Check if we're calculating token value
    else if (args.length >= 2 && !isNaN(args[1])) {
      const tokenMint = args[0];
      const amount = parseFloat(args[1]);

      console.log(`Calculating value for ${amount} tokens of mint ${tokenMint}...`);

      const valueInfo = await calculateTokenValue(tokenMint, amount);

      console.log('\n=== Token Value Results ===');
      if (valueInfo.tokenName) {
        console.log(`Token: ${valueInfo.tokenName} (${valueInfo.tokenSymbol})`);
      }
      console.log(`Mint: ${valueInfo.tokenMint}`);
      console.log(`Amount: ${valueInfo.normalizedAmount || valueInfo.amount}`);

      if (valueInfo.valueUSD !== null) {
        console.log(`Value: $${valueInfo.valueUSD.toFixed(4)} USD`);
        console.log(`Price per token: $${valueInfo.pricePerToken.toFixed(6)} ${valueInfo.currency}`);
      } else {
        console.log(`Value: Not available (${valueInfo.message})`);
      }

      // Show dusting analysis
      console.log(`\nDusting Analysis:`);
      console.log(`Considered Dust: ${valueInfo.isDust ? 'YES' : 'NO'}`);
      console.log(`Dusting Risk: ${valueInfo.dustingRisk}`);

      if (valueInfo.dustReason) {
        console.log(`Reason: ${valueInfo.dustReason}`);
      }

      // Show scam analysis if available
      if (valueInfo.scamScore !== undefined) {
        console.log(`\nScam Analysis:`);
        console.log(`Scam Score: ${valueInfo.scamScore} (higher = more suspicious)`);
        console.log(`Likely Scam: ${valueInfo.isLikelyScam ? 'YES' : 'NO'}`);

        if (valueInfo.suspiciousIndicators && valueInfo.suspiciousIndicators.length > 0) {
          console.log(`\nSuspicious Indicators:`);
          valueInfo.suspiciousIndicators.forEach((indicator, i) => {
            console.log(`  ${i+1}. ${indicator}`);
          });
        }
      }
    }
    // Default: fetch single token price
    else {
      const tokenMint = args[0];
      console.log(`Fetching price for token ${tokenMint}...`);

      const tokenInfo = await getTokenPrice(tokenMint);

      console.log('\n=== Token Price Results ===');
      if (!tokenInfo) {
        console.log('Error: Could not fetch token information');
        process.exit(1);
      }

      console.log(`Token: ${tokenInfo.name} (${tokenInfo.symbol})`);
      console.log(`Mint: ${tokenInfo.mint}`);
      console.log(`Decimals: ${tokenInfo.decimals}`);

      if (tokenInfo.price) {
        console.log(`Price: ${tokenInfo.price.pricePerToken} ${tokenInfo.price.currency}`);
        console.log(`Last Updated: ${tokenInfo.price.lastUpdated}`);
      } else {
        console.log('Price: Not available');
      }

      // Show token metadata
      if (tokenInfo.description) {
        console.log(`\nDescription: ${tokenInfo.description.substring(0, 100)}${tokenInfo.description.length > 100 ? '...' : ''}`);
      }

      if (tokenInfo.supply) {
        console.log(`Supply: ${tokenInfo.supply}`);
      }

      // Show scam analysis if available
      if (tokenInfo.scamAnalysis) {
        console.log(`\nScam Analysis:`);
        console.log(`Scam Score: ${tokenInfo.scamAnalysis.scamScore} (higher = more suspicious)`);
        console.log(`Likely Scam: ${tokenInfo.scamAnalysis.isLikelyScam ? 'YES' : 'NO'}`);
        console.log(`Recommended Dust Threshold: ${tokenInfo.scamAnalysis.recommendedDustThreshold} tokens`);

        if (tokenInfo.scamAnalysis.suspiciousIndicators.length > 0) {
          console.log(`\nSuspicious Indicators:`);
          tokenInfo.scamAnalysis.suspiciousIndicators.forEach((indicator, i) => {
            console.log(`  ${i+1}. ${indicator}`);
          });
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
