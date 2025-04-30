/**
 * Test script for Address Poisoning Detection
 * 
 * This script tests the address poisoning detection functionality
 * by analyzing a known wallet address.
 */

const { detectAddressPoisoning } = require('./src/analyzers/address-poisoning-analyzer');

// Example wallet address to test (Solana Foundation address)
const walletAddress = 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg';
const numTransactions = 50;

console.log(`Testing address poisoning detection for wallet: ${walletAddress}`);
console.log(`Analyzing ${numTransactions} transactions...`);

// Run the address poisoning detector
detectAddressPoisoning(walletAddress, numTransactions)
  .then(result => {
    console.log('\nTest completed successfully!');
    
    // Log summary of results
    console.log('\nSummary:');
    console.log(`- Wallet: ${result.walletAddress}`);
    console.log(`- Transactions analyzed: ${numTransactions}`);
    console.log(`- Frequent addresses found: ${result.frequentAddresses.length}`);
    console.log(`- Similar addresses found: ${result.similarAddresses.length}`);
    console.log(`- Potential poisoning attempts: ${result.addressPoisoningAttempts.length}`);
    console.log(`- Risk level: ${result.riskLevel} (Score: ${result.riskScore})`);
  })
  .catch(error => {
    console.error('Error running address poisoning test:', error);
    process.exit(1);
  });
