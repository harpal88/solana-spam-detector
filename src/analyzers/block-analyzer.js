/**
 * Block Analyzer for Solana Dusting Attack Detector
 *
 * This module provides functions for analyzing Solana blocks
 * to detect potential dusting attacks.
 */

const { makeRpcRequest } = require('../api/api-helpers');
const { analyzeTransaction } = require('./transaction-analyzer');

/**
 * Analyze transactions in a block range
 * @param {number} startSlot - The starting slot number
 * @param {number} endSlot - The ending slot number
 * @param {number} maxTransactions - Maximum number of transactions to analyze
 */
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

      // Determine attack vector if it's a dusting attack
      if (result.isDusting) {
        dustingCount++;

        // Determine the primary attack vector if not already set
        if (!result.primaryAttackVector) {
          let hasNativeTransfer = false;
          let hasTokenTransfer = false;
          let hasMemo = false;

          for (const indicator of result.dustingIndicators) {
            if (indicator.type === 'native') hasNativeTransfer = true;
            else if (indicator.type === 'token') hasTokenTransfer = true;
            else if (indicator.type === 'memo') hasMemo = true;
          }

          // Set the primary attack vector
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
        }
      }

      analysisResults.push(result);

      // Show progress
      process.stdout.write(`Analyzed ${analysisResults.length}/${allTransactions.length} transactions\r`);
    }

    console.log('\n');  // Clear the progress line

    // Display results
    console.log('\n=== Analysis Results ===');
    console.log(`\nBlock Range Analysis:`);
    console.log(`Analyzed ${analysisResults.length} transactions from blocks ${startSlot} to ${endSlot}`);
    console.log(`Found ${dustingCount} potential dusting attacks (${((dustingCount / analysisResults.length) * 100).toFixed(2)}% of transactions)`);

    // Count transaction types
    const txTypes = {};

    analysisResults.forEach(result => {
      txTypes[result.type] = (txTypes[result.type] || 0) + 1;
    });

    console.log(`\nTransaction Types:`);
    Object.entries(txTypes).forEach(([type, count]) => {
      console.log(`- ${type}: ${count} transaction(s)`);
    });

    // Show non-dusting transactions that were excluded
    const excludedTypes = analysisResults.filter(r => !r.isDusting && r.reason).map(r => r.type);
    if (excludedTypes.length > 0) {
      console.log(`\nExcluded Transaction Types:`);
      const uniqueExcludedTypes = [...new Set(excludedTypes)];
      uniqueExcludedTypes.forEach(type => {
        const count = excludedTypes.filter(t => t === type).length;
        console.log(`- ${type}: ${count} transaction(s) - Not considered dusting attacks`);
      });
    }

    if (dustingCount > 0) {
      // Count attack vectors
      const attackVectorCounts = {};
      analysisResults.filter(r => r.isDusting).forEach(result => {
        if (result.primaryAttackVector) {
          attackVectorCounts[result.primaryAttackVector] = (attackVectorCounts[result.primaryAttackVector] || 0) + 1;
        }
      });

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

      console.log('\nPotential Dusting Attacks:');
      analysisResults.filter(r => r.isDusting).forEach((result, index) => {
        console.log(`\n${index + 1}. Transaction: ${result.signature.substring(0, 16)}...`);
        console.log(`   Type: ${result.type}`);
        console.log(`   Attack Vector: ${result.primaryAttackVector || 'UNKNOWN'}`);
        console.log(`   Description: ${result.description}`);
        console.log(`   Timestamp: ${new Date(result.timestamp * 1000).toLocaleString()}`);

        // Show indicators
        if (result.dustingIndicators && result.dustingIndicators.length > 0) {
          console.log('   Indicators:');
          result.dustingIndicators.forEach(indicator => {
            console.log(`   - ${indicator.reason}`);
          });
        }
      });
    }

    console.log('\n=== Analysis Complete ===');
  } catch (error) {
    console.error('Error analyzing block range:', error);
  }
}

module.exports = {
  analyzeBlockRange
};
