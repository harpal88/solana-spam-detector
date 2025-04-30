/**
 * Batch Analyzer for Solana Dusting Attack Detector
 *
 * This module provides functions for analyzing multiple Solana wallets
 * to detect potential dusting attacks.
 */

const { getTransactionSignatures } = require('../api/api-helpers');
const { analyzeTransaction } = require('./transaction-analyzer');

/**
 * Analyze multiple wallets (batch analysis)
 * @param {Array<string>} wallets - Array of wallet addresses to analyze
 * @param {number} numTransactions - Number of transactions to analyze per wallet
 */
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

module.exports = {
  analyzeBatchWallets
};
