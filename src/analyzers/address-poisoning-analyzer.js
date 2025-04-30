/**
 * Address Poisoning Analyzer for Solana Dusting Attack Detector
 *
 * This module provides functions for analyzing Solana wallets
 * to detect potential address poisoning attacks.
 *
 * Address poisoning is a scam where attackers create addresses similar to
 * frequently used addresses in a victim's transaction history, then send
 * small transactions to make their address appear in the victim's history.
 * When the victim later sends funds, they might mistakenly select the
 * attacker's similar-looking address instead of the legitimate one.
 */

const {
  getTransactionSignatures,
  makeRpcRequest,
  makeApiRequest,
  makePublicRpcRequest
} = require('../api/api-helpers');

// Import token utilities
const { isVerifiedToken, isStablecoin } = require('../utils/token-whitelist');
const { calculateTokenValue } = require('../utils/token-price-fetcher');

/**
 * Detect address poisoning attempts for a wallet
 * @param {string} walletAddress - The wallet address to analyze
 * @param {number} numTransactions - Number of transactions to analyze
 * @returns {Promise<Object>} - Analysis results
 */
async function detectAddressPoisoning(walletAddress, numTransactions = 50) {
  console.log(`\n=== Solana Address Poisoning Detector ===`);
  console.log(`Analyzing wallet: ${walletAddress}`);
  console.log(`Number of transactions to analyze: ${numTransactions}`);
  console.log('======================================\n');

  // Step 1: Get transaction signatures
  console.log('Fetching transaction signatures...');
  const signatures = await getTransactionSignatures(walletAddress, numTransactions);

  if (signatures.length === 0) {
    console.log('No transactions found for this wallet address.');
    return {
      walletAddress,
      numTransactions,
      addressPoisoningAttempts: [],
      frequentAddresses: [],
      similarAddresses: [],
      riskLevel: 'NONE',
      riskScore: 0
    };
  }

  console.log(`Found ${signatures.length} transactions.\n`);

  // Step 2: Analyze transactions to find frequent addresses and similar addresses
  console.log('Analyzing transactions for address poisoning attempts...');

  // Track all addresses that interact with this wallet
  const addressInteractions = new Map();
  // Track all transaction data
  const transactions = [];
  // Track transaction types for each address
  const addressTransactionTypes = new Map();
  // Track token transfers for each address
  const addressTokenTransfers = new Map();
  // Track native transfers for each address
  const addressNativeTransfers = new Map();
  // Track transaction timestamps for each address
  const addressTimestamps = new Map();

  // Process each transaction
  for (let i = 0; i < signatures.length; i++) {
    const signature = signatures[i];

    try {
      // Get transaction data from Helius API
      const txData = await makeApiRequest('/transactions', 'POST', {
        transactions: [signature],
      });

      // If Helius API fails, try public RPC as fallback
      let tx = null;
      if (!txData || !txData[0]) {
        console.log(`Helius API failed for transaction ${signature}, trying public RPC...`);

        try {
          // Get transaction from public RPC
          const txResponse = await makePublicRpcRequest('getTransaction', [
            signature,
            { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }
          ]);

          if (txResponse && txResponse.result) {
            // Create a simplified transaction object from RPC response
            tx = {
              signature,
              timestamp: Math.floor(Date.now() / 1000), // Use current time as fallback
              type: 'UNKNOWN',
              description: 'Transaction fetched from public RPC',
              nativeTransfers: [],
              tokenTransfers: []
            };

            // Extract native transfers if available
            if (txResponse.result.meta && txResponse.result.meta.preBalances && txResponse.result.meta.postBalances) {
              const preBalances = txResponse.result.meta.preBalances;
              const postBalances = txResponse.result.meta.postBalances;
              const accountKeys = txResponse.result.transaction.message.accountKeys;

              for (let i = 0; i < accountKeys.length; i++) {
                const address = accountKeys[i];
                const preBal = preBalances[i] || 0;
                const postBal = postBalances[i] || 0;
                const diff = postBal - preBal;

                if (Math.abs(diff) > 0) {
                  if (diff > 0 && address !== walletAddress) {
                    // This address received SOL
                    tx.nativeTransfers.push({
                      fromUserAccount: walletAddress,
                      toUserAccount: address,
                      amount: diff
                    });
                  } else if (diff < 0 && address !== walletAddress) {
                    // This address sent SOL
                    tx.nativeTransfers.push({
                      fromUserAccount: address,
                      toUserAccount: walletAddress,
                      amount: Math.abs(diff)
                    });
                  }
                }
              }
            }
          }
        } catch (rpcError) {
          console.log(`Public RPC also failed for transaction ${signature}: ${rpcError.message}`);
        }
      } else {
        tx = txData[0];
      }

      if (!tx) {
        console.log(`Could not fetch data for transaction ${signature}`);
        continue;
      }

      transactions.push(tx);

      // Extract all addresses involved in the transaction
      const addresses = new Set();

      // Add native transfer addresses
      if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
        tx.nativeTransfers.forEach(transfer => {
          if (transfer.fromUserAccount && transfer.fromUserAccount !== walletAddress) {
            addresses.add(transfer.fromUserAccount);

            // Track native transfers for this address
            const transfers = addressNativeTransfers.get(transfer.fromUserAccount) || [];
            transfers.push({
              signature: tx.signature,
              timestamp: tx.timestamp,
              amount: transfer.amount / 1000000000, // Convert lamports to SOL
              direction: 'from',
              counterparty: transfer.toUserAccount
            });
            addressNativeTransfers.set(transfer.fromUserAccount, transfers);
          }

          if (transfer.toUserAccount && transfer.toUserAccount !== walletAddress) {
            addresses.add(transfer.toUserAccount);

            // Track native transfers for this address
            const transfers = addressNativeTransfers.get(transfer.toUserAccount) || [];
            transfers.push({
              signature: tx.signature,
              timestamp: tx.timestamp,
              amount: transfer.amount / 1000000000, // Convert lamports to SOL
              direction: 'to',
              counterparty: transfer.fromUserAccount
            });
            addressNativeTransfers.set(transfer.toUserAccount, transfers);
          }
        });
      }

      // Add token transfer addresses
      if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        tx.tokenTransfers.forEach(transfer => {
          if (transfer.fromUserAccount && transfer.fromUserAccount !== walletAddress) {
            addresses.add(transfer.fromUserAccount);

            // Track token transfers for this address
            const transfers = addressTokenTransfers.get(transfer.fromUserAccount) || [];
            transfers.push({
              signature: tx.signature,
              timestamp: tx.timestamp,
              amount: parseFloat(transfer.tokenAmount),
              mint: transfer.mint,
              direction: 'from',
              counterparty: transfer.toUserAccount
            });
            addressTokenTransfers.set(transfer.fromUserAccount, transfers);
          }

          if (transfer.toUserAccount && transfer.toUserAccount !== walletAddress) {
            addresses.add(transfer.toUserAccount);

            // Track token transfers for this address
            const transfers = addressTokenTransfers.get(transfer.toUserAccount) || [];
            transfers.push({
              signature: tx.signature,
              timestamp: tx.timestamp,
              amount: parseFloat(transfer.tokenAmount),
              mint: transfer.mint,
              direction: 'to',
              counterparty: transfer.fromUserAccount
            });
            addressTokenTransfers.set(transfer.toUserAccount, transfers);
          }
        });
      }

      // Update address interaction counts and transaction types
      addresses.forEach(address => {
        // Update interaction count
        const count = addressInteractions.get(address) || 0;
        addressInteractions.set(address, count + 1);

        // Update transaction types
        const types = addressTransactionTypes.get(address) || new Set();
        types.add(tx.type);
        addressTransactionTypes.set(address, types);

        // Update timestamps
        const timestamps = addressTimestamps.get(address) || [];
        timestamps.push(tx.timestamp);
        addressTimestamps.set(address, timestamps);
      });

      // Show progress
      console.log(`Analyzed ${i + 1}/${signatures.length} transactions`);
    } catch (error) {
      console.error(`Error analyzing transaction ${signature}: ${error.message}`);
    }
  }

  // Step 3: Find frequent addresses (potential targets for poisoning)
  const frequentAddresses = Array.from(addressInteractions.entries())
    .filter(([_, count]) => count >= 2) // Addresses used at least twice
    .sort((a, b) => b[1] - a[1]) // Sort by frequency (descending)
    .map(([address, count]) => ({
      address,
      count,
      transactionTypes: Array.from(addressTransactionTypes.get(address) || []),
      lastInteraction: Math.max(...(addressTimestamps.get(address) || [0]))
    }));

  console.log(`\nFound ${frequentAddresses.length} frequently used addresses.`);

  // Step 4: Find similar addresses that might be poisoning attempts
  const similarAddresses = [];
  const poisoningAttempts = [];

  // Compare all addresses to find similar ones
  const allAddresses = Array.from(addressInteractions.keys());

  for (let i = 0; i < allAddresses.length; i++) {
    const address1 = allAddresses[i];
    if (!address1) continue; // Skip null or undefined addresses

    for (let j = i + 1; j < allAddresses.length; j++) {
      const address2 = allAddresses[j];
      if (!address2) continue; // Skip null or undefined addresses

      try {
        // Check if addresses are similar
        const similarityResult = calculateAddressSimilarity(address1, address2);
        if (similarityResult.isSimilar) {
          similarAddresses.push({
            address1,
            address2,
            similarityScore: similarityResult.similarityPercentage,
            matchingPattern: similarityResult.matchingPattern
          });

          // Check if this might be a poisoning attempt
          const isPoisoningAttempt = await checkPoisoningAttempt(
            walletAddress,
            address1,
            address2,
            transactions,
            addressNativeTransfers,
            addressTokenTransfers,
            addressInteractions
          );

        if (isPoisoningAttempt) {
          poisoningAttempts.push({
            legitimateAddress: isPoisoningAttempt.legitimateAddress,
            poisonedAddress: isPoisoningAttempt.poisonedAddress,
            similarity: isPoisoningAttempt.similarity,
            matchingPattern: isPoisoningAttempt.matchingPattern,
            transactions: isPoisoningAttempt.transactions,
            confidenceScore: isPoisoningAttempt.confidenceScore,
            attackVector: isPoisoningAttempt.attackVector
          });
        }
        }
      } catch (error) {
        console.error(`Error analyzing similarity between addresses ${address1} and ${address2}: ${error.message}`);
      }
    }
  }

  console.log(`Found ${similarAddresses.length} pairs of similar addresses.`);
  console.log(`Detected ${poisoningAttempts.length} potential address poisoning attempts.`);

  // Step 5: Calculate risk score and level
  let riskScore = 0;
  let riskLevel = 'NONE';
  let primaryAttackVector = '';
  let totalSuspiciousAmount = 0;
  let suspiciousTransactionCount = 0;

  if (poisoningAttempts.length > 0) {
    // Calculate risk based on multiple factors

    // Factor 1: Number of poisoning attempts
    riskScore += Math.min(50, poisoningAttempts.length * 15);

    // Factor 2: Average confidence score of attempts
    const avgConfidence = poisoningAttempts.reduce((sum, attempt) => sum + attempt.confidenceScore, 0) / poisoningAttempts.length;
    riskScore += avgConfidence * 0.5;

    // Factor 3: Total number of suspicious transactions
    suspiciousTransactionCount = poisoningAttempts.reduce((sum, attempt) => sum + attempt.transactions.length, 0);
    riskScore += Math.min(20, suspiciousTransactionCount * 2);

    // Factor 4: Similarity scores
    const avgSimilarity = poisoningAttempts.reduce((sum, attempt) => {
      return sum + parseFloat(attempt.similarity.replace('%', ''));
    }, 0) / poisoningAttempts.length;
    riskScore += avgSimilarity * 0.2;

    // Calculate total suspicious amount
    poisoningAttempts.forEach(attempt => {
      attempt.transactions.forEach(tx => {
        if (tx.valueUSD) {
          totalSuspiciousAmount += tx.valueUSD;
        } else if (tx.type === 'SOL') {
          // Estimate SOL value (very rough approximation)
          totalSuspiciousAmount += tx.amount * 20; // Assuming $20 per SOL as a placeholder
        }
      });
    });

    // Determine primary attack vector
    const attackVectors = poisoningAttempts.map(attempt => attempt.attackVector);
    const vectorCounts = {};
    attackVectors.forEach(vector => {
      vectorCounts[vector] = (vectorCounts[vector] || 0) + 1;
    });

    primaryAttackVector = Object.entries(vectorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([vector]) => vector)[0];

    // Cap risk score at 100
    riskScore = Math.min(100, riskScore);

    // Determine risk level based on score
    if (riskScore >= 75) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 50) {
      riskLevel = 'MEDIUM';
    } else if (riskScore >= 25) {
      riskLevel = 'LOW';
    }
  }

  // Step 6: Display detailed results
  console.log('\n=== Address Poisoning Analysis Results ===');

  if (poisoningAttempts.length > 0) {
    console.log('\nPotential Address Poisoning Attempts:');

    poisoningAttempts.forEach((attempt, index) => {
      console.log(`\n${index + 1}. Potential poisoning detected:`);
      console.log(`   Legitimate address: ${attempt.legitimateAddress}`);
      console.log(`   Poisoned address:   ${attempt.poisonedAddress}`);
      console.log(`   Similarity: ${attempt.similarity} (${attempt.matchingPattern})`);
      console.log(`   Attack vector: ${attempt.attackVector}`);
      console.log(`   Confidence score: ${attempt.confidenceScore.toFixed(1)}/100`);

      console.log(`   Suspicious transactions (${attempt.transactions.length}):`);
      attempt.transactions.forEach((tx, txIndex) => {
        console.log(`     ${txIndex + 1}. Signature: ${tx.signature}`);
        console.log(`        Date: ${new Date(tx.timestamp * 1000).toLocaleString()}`);
        console.log(`        Amount: ${tx.amount} ${tx.type}`);
        if (tx.valueUSD) {
          console.log(`        Value: $${tx.valueUSD.toFixed(2)} USD`);
        }
        if (tx.mint) {
          console.log(`        Token: ${tx.mint}`);
        }
      });
    });

    console.log(`\nRisk Assessment:`);
    console.log(`   Risk Level: ${riskLevel}`);
    console.log(`   Risk Score: ${riskScore.toFixed(1)}/100`);
    console.log(`   Primary Attack Vector: ${primaryAttackVector}`);
    console.log(`   Suspicious Transactions: ${suspiciousTransactionCount}`);
    if (totalSuspiciousAmount > 0) {
      console.log(`   Estimated Suspicious Amount: $${totalSuspiciousAmount.toFixed(2)} USD`);
    }

    // Add recommendations
    console.log('\n⚠️ Recommendations:');
    console.log('1. Always verify the ENTIRE address when sending funds, not just the first and last few characters');
    console.log('2. Use the address book feature in your wallet to save legitimate addresses');
    console.log('3. Send a small test transaction before sending large amounts');
    console.log('4. Consider using a hardware wallet with address verification');
    console.log('5. Be especially cautious when sending to addresses that look similar to your frequent contacts');
    console.log('6. Check transaction history for small "dust" transactions from suspicious addresses');
    console.log('7. If you identify a poisoned address, mark it in your wallet or block it if possible');
  } else {
    console.log('\nNo address poisoning attempts detected.');
    console.log('\nThis does not guarantee complete safety. Always verify addresses when sending funds.');
  }

  console.log('\n=== Analysis Complete ===');

  // Return the analysis results
  return {
    walletAddress,
    numTransactions,
    addressPoisoningAttempts: poisoningAttempts,
    frequentAddresses,
    similarAddresses,
    riskLevel,
    riskScore,
    primaryAttackVector,
    suspiciousTransactionCount,
    totalSuspiciousAmount
  };
}

/**
 * Calculate similarity between two addresses
 * @param {string} address1 - First address
 * @param {string} address2 - Second address
 * @returns {Object} - Similarity details
 */
function calculateAddressSimilarity(address1, address2) {
  // Ensure both addresses are strings
  const addr1 = String(address1);
  const addr2 = String(address2);

  // Don't compare addresses of different lengths
  if (addr1.length !== addr2.length) {
    return {
      isSimilar: false,
      similarityPercentage: 0,
      matchingPattern: 'None'
    };
  }

  // Check if first N characters match (prefix matching)
  const prefixLength = Math.min(6, addr1.length); // Check first 6 characters or less if address is shorter
  const prefixMatch = addr1.substring(0, prefixLength) === addr2.substring(0, prefixLength);

  // Check if last N characters match (suffix matching)
  const suffixLength = Math.min(6, addr1.length); // Check last 6 characters or less if address is shorter
  const suffixMatch = addr1.substring(addr1.length - suffixLength) === addr2.substring(addr2.length - suffixLength);

  // Check for sandwich pattern (first and last few characters match)
  const sandwichLength = Math.min(4, Math.floor(addr1.length / 4)); // Use 4 or less for very short addresses
  const sandwichMatch =
    addr1.substring(0, sandwichLength) === addr2.substring(0, sandwichLength) &&
    addr1.substring(addr1.length - sandwichLength) === addr2.substring(addr2.length - sandwichLength);

  // Calculate overall similarity (percentage of matching characters)
  let matchingChars = 0;
  for (let i = 0; i < addr1.length; i++) {
    if (addr1[i] === addr2[i]) {
      matchingChars++;
    }
  }

  const similarityPercentage = (matchingChars / addr1.length) * 100;

  // Determine matching pattern
  let matchingPattern = 'None';
  if (prefixMatch && suffixMatch) {
    matchingPattern = 'Prefix+Suffix';
  } else if (prefixMatch) {
    matchingPattern = 'Prefix';
  } else if (suffixMatch) {
    matchingPattern = 'Suffix';
  } else if (sandwichMatch) {
    matchingPattern = 'Sandwich';
  } else if (similarityPercentage >= 60) {
    matchingPattern = 'High Overall Similarity';
  }

  // Determine if addresses are similar enough to be considered for poisoning
  const isSimilar =
    prefixMatch ||
    suffixMatch ||
    sandwichMatch ||
    similarityPercentage >= 60;

  return {
    isSimilar,
    similarityPercentage,
    matchingPattern
  };
}

/**
 * Check if a pair of similar addresses might be a poisoning attempt
 * @param {string} walletAddress - The wallet being analyzed
 * @param {string} address1 - First address
 * @param {string} address2 - Second address
 * @param {Array} transactions - Transaction data
 * @param {Map} addressNativeTransfers - Native transfers by address
 * @param {Map} addressTokenTransfers - Token transfers by address
 * @param {Map} addressInteractions - Interaction counts by address
 * @returns {Object|null} - Poisoning attempt details or null
 */
async function checkPoisoningAttempt(
  walletAddress,
  address1,
  address2,
  transactions,
  addressNativeTransfers,
  addressTokenTransfers,
  addressInteractions
) {
  try {
    // Ensure addresses are strings
    const addr1 = String(address1);
    const addr2 = String(address2);

    // Find transactions involving these addresses
    const address1Txs = transactions.filter(tx =>
      (tx.nativeTransfers && tx.nativeTransfers.some(t =>
        t.fromUserAccount === addr1 || t.toUserAccount === addr1)) ||
      (tx.tokenTransfers && tx.tokenTransfers.some(t =>
        t.fromUserAccount === addr1 || t.toUserAccount === addr1))
    );

    const address2Txs = transactions.filter(tx =>
      (tx.nativeTransfers && tx.nativeTransfers.some(t =>
        t.fromUserAccount === addr2 || t.toUserAccount === addr2)) ||
      (tx.tokenTransfers && tx.tokenTransfers.some(t =>
        t.fromUserAccount === addr2 || t.toUserAccount === addr2))
    );

    // If both addresses have transactions, analyze for poisoning patterns
    if (address1Txs.length > 0 && address2Txs.length > 0) {
      // Get interaction counts
      const address1Count = addressInteractions.get(address1) || 0;
      const address2Count = addressInteractions.get(address2) || 0;

      // The address with more transactions is likely the legitimate one
      const legitimateAddress = address1Count >= address2Count ? address1 : address2;
      const poisonedAddress = legitimateAddress === address1 ? address2 : address1;

      // Get transactions for the potentially poisoned address
      const poisonedTxs = legitimateAddress === address1 ? address2Txs : address1Txs;

      // Get native and token transfers for the potentially poisoned address
      const nativeTransfers = addressNativeTransfers.get(poisonedAddress) || [];
      const tokenTransfers = addressTokenTransfers.get(poisonedAddress) || [];

      // Check for suspicious patterns in transactions
      const suspiciousTransactions = [];
      let confidenceScore = 0;
      let attackVector = 'Unknown';

      // Check native transfers for small amounts (dust)
      for (const transfer of nativeTransfers) {
        // Small SOL transfers are suspicious
        if (transfer.amount < 0.01) {
          // Try to get transaction details
          const tx = transactions.find(t => t.signature === transfer.signature);
          if (tx) {
            suspiciousTransactions.push({
              signature: tx.signature,
              timestamp: tx.timestamp,
              amount: transfer.amount,
              type: 'SOL',
              direction: transfer.direction,
              counterparty: transfer.counterparty
            });

            // Increase confidence score based on transfer characteristics
            confidenceScore += 15; // Base score for suspicious transfer

            // Very small amounts are more suspicious
            if (transfer.amount < 0.001) {
              confidenceScore += 10;
              attackVector = 'Dust SOL Transfer';
            }

            // Recent transactions are more suspicious
            const now = Math.floor(Date.now() / 1000);
            const txAge = now - tx.timestamp;
            if (txAge < 86400) { // Less than 1 day old
              confidenceScore += 10;
            }
          }
        }
      }

      // Check token transfers for small amounts (dust)
      for (const transfer of tokenTransfers) {
        // Try to determine if this is a dust transfer
        let isDust = false;
        let valueUSD = 0;

        try {
          // Check if token amount is small
          if (transfer.amount < 1) {
            isDust = true;

            // Try to get token value
            const tokenAnalysis = await calculateTokenValue(transfer.mint, transfer.amount);
            if (tokenAnalysis && tokenAnalysis.valueUSD) {
              valueUSD = tokenAnalysis.valueUSD;

              // If value is significant, it might not be dust
              if (valueUSD > 1) {
                isDust = false;
              }
            }
          }
        } catch (error) {
          // If token analysis fails, use simple heuristic
          isDust = transfer.amount < 0.1;
        }

        if (isDust) {
          // Try to get transaction details
          const tx = transactions.find(t => t.signature === transfer.signature);
          if (tx) {
            suspiciousTransactions.push({
              signature: tx.signature,
              timestamp: tx.timestamp,
              amount: transfer.amount,
              type: 'TOKEN',
              mint: transfer.mint,
              valueUSD,
              direction: transfer.direction,
              counterparty: transfer.counterparty
            });

            // Increase confidence score based on transfer characteristics
            confidenceScore += 20; // Base score for suspicious token transfer

            // Very small amounts are more suspicious
            if (transfer.amount < 0.01) {
              confidenceScore += 15;
              attackVector = 'Dust Token Transfer';
            }

            // Recent transactions are more suspicious
            const now = Math.floor(Date.now() / 1000);
            const txAge = now - tx.timestamp;
            if (txAge < 86400) { // Less than 1 day old
              confidenceScore += 10;
            }
          }
        }
      }

      // Calculate similarity details
      const similarityResult = calculateAddressSimilarity(address1, address2);

      // Adjust confidence score based on similarity
      if (similarityResult.matchingPattern === 'Prefix+Suffix') {
        confidenceScore += 25;
        if (attackVector === 'Unknown') {
          attackVector = 'Prefix+Suffix Matching';
        }
      } else if (similarityResult.matchingPattern === 'Prefix') {
        confidenceScore += 20;
        if (attackVector === 'Unknown') {
          attackVector = 'Prefix Matching';
        }
      } else if (similarityResult.matchingPattern === 'Suffix') {
        confidenceScore += 15;
        if (attackVector === 'Unknown') {
          attackVector = 'Suffix Matching';
        }
      } else if (similarityResult.matchingPattern === 'Sandwich') {
        confidenceScore += 20;
        if (attackVector === 'Unknown') {
          attackVector = 'Sandwich Pattern';
        }
      }

      // Add points for high similarity percentage
      confidenceScore += similarityResult.similarityPercentage * 0.2;

      // Cap confidence score at 100
      confidenceScore = Math.min(100, confidenceScore);

      // If there are suspicious transactions, this might be a poisoning attempt
      if (suspiciousTransactions.length > 0) {
        return {
          legitimateAddress,
          poisonedAddress,
          similarity: `${similarityResult.similarityPercentage.toFixed(1)}%`,
          matchingPattern: similarityResult.matchingPattern,
          transactions: suspiciousTransactions,
          confidenceScore,
          attackVector
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Error in checkPoisoningAttempt: ${error.message}`);
    return null;
  }
}

module.exports = {
  detectAddressPoisoning,
  calculateAddressSimilarity,
  checkPoisoningAttempt
};
