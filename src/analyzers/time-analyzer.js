/**
 * Time-Based Analyzer for Solana Dusting Attack Detector
 *
 * This module provides functions for analyzing Solana transactions
 * within a specific time range to detect potential dusting attacks.
 */

const { getTransactionSignatures } = require('../api/api-helpers');
const { analyzeTransaction } = require('./transaction-analyzer');

/**
 * Parse a date string or timestamp into a Unix timestamp
 * @param {string|number} dateInput - Date string, timestamp, or Date object
 * @returns {number} Unix timestamp (seconds since epoch)
 */
function parseDate(dateInput) {
  console.log(`Parsing date input: ${dateInput} (type: ${typeof dateInput})`);

  // If it's already a number, assume it's a timestamp
  if (typeof dateInput === 'number') {
    // Check if it's in milliseconds (13 digits) and convert to seconds if needed
    if (dateInput > 10000000000) {
      console.log(`Converting millisecond timestamp ${dateInput} to seconds: ${Math.floor(dateInput / 1000)}`);
      return Math.floor(dateInput / 1000);
    }
    console.log(`Using timestamp as is: ${dateInput}`);
    return dateInput;
  }

  // If it's a Date object, convert to timestamp
  if (dateInput instanceof Date) {
    const timestamp = Math.floor(dateInput.getTime() / 1000);
    console.log(`Converting Date object to timestamp: ${timestamp}`);
    return timestamp;
  }

  // If it's a string, try to parse it
  if (typeof dateInput === 'string') {
    // Check for date format strings first
    // For date strings like "2023-01-01", create a specific date
    if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateInput.split('-').map(Number);
      const parsedDate = new Date(year, month - 1, day); // Month is 0-indexed in JS Date
      const timestamp = Math.floor(parsedDate.getTime() / 1000);
      console.log(`Parsed date string "${dateInput}" to: ${parsedDate.toLocaleString()} (timestamp: ${timestamp})`);
      return timestamp;
    }

    // Try other date formats
    try {
      const parsedDate = new Date(dateInput);
      if (!isNaN(parsedDate.getTime())) {
        const timestamp = Math.floor(parsedDate.getTime() / 1000);
        console.log(`Parsed date string "${dateInput}" to: ${parsedDate.toLocaleString()} (timestamp: ${timestamp})`);
        return timestamp;
      }
    } catch (error) {
      console.error(`Error parsing date string: ${error.message}`);
    }

    // If date parsing failed, try parsing as a timestamp
    const parsedTimestamp = parseInt(dateInput, 10);
    if (!isNaN(parsedTimestamp)) {
      // Check if it's in milliseconds (13 digits) and convert to seconds if needed
      if (parsedTimestamp > 10000000000) {
        console.log(`Converting string millisecond timestamp ${parsedTimestamp} to seconds: ${Math.floor(parsedTimestamp / 1000)}`);
        return Math.floor(parsedTimestamp / 1000);
      }
      console.log(`Using string timestamp as is: ${parsedTimestamp}`);
      return parsedTimestamp;
    }
  }

  // If we couldn't parse it, throw an error
  throw new Error(`Could not parse date: ${dateInput}`);
}

/**
 * Analyze transactions within a time range
 * @param {string} walletAddress - The wallet address to analyze
 * @param {string|number|Date} startTime - Start time (date string, Unix timestamp, or Date object)
 * @param {string|number|Date} endTime - End time (date string, Unix timestamp, or Date object)
 * @param {number} maxTransactions - Maximum number of transactions to analyze
 */
async function analyzeTimeRange(walletAddress, startTime, endTime, maxTransactions = 50) {
  // Convert times to Unix timestamps
  let startTimestamp, endTimestamp;

  try {
    startTimestamp = parseDate(startTime);
    endTimestamp = parseDate(endTime);
  } catch (error) {
    console.error(`Error parsing date: ${error.message}`);
    throw error;
  }

  console.log(`\n=== Solana Time-Based Analysis ===`);
  console.log(`Analyzing wallet: ${walletAddress}`);
  console.log(`Time range: ${new Date(startTimestamp * 1000).toLocaleString()} to ${new Date(endTimestamp * 1000).toLocaleString()}`);
  console.log(`Maximum transactions to analyze: ${maxTransactions}`);
  console.log('======================================\n');

  try {
    // Get transactions in the time range
    console.log('Fetching transactions in time range...');

    // Unfortunately, Helius API doesn't directly support time-based filtering
    // So we'll get all transactions and filter them by timestamp
    // We'll get a reasonable number of transactions to filter, but respect the maxTransactions limit
    const fetchLimit = Math.min(maxTransactions * 2, 100); // Get at most 2x the requested transactions or 100, whichever is smaller
    const signatures = await getTransactionSignatures(walletAddress, fetchLimit);

    if (signatures.length === 0) {
      console.log('No transactions found for this wallet address.');
      return;
    }

    console.log(`Found ${signatures.length} transactions, filtering by time range...`);

    // Analyze each transaction to check its timestamp
    const analysisResults = [];
    let dustingCount = 0;
    let victimCount = 0;
    let attackerCount = 0;
    let unknownRoleCount = 0;

    for (const signature of signatures) {
      const result = await analyzeTransaction(signature);

      // Check if transaction is within the time range
      if (result.timestamp >= startTimestamp && result.timestamp <= endTimestamp) {
        analysisResults.push(result);

        // Determine role in this transaction if it's a dusting attack
        if (result.isDusting) {
          dustingCount++;

          let isVictim = false;
          let isAttacker = false;

          for (const indicator of result.dustingIndicators) {
            if (indicator.type === 'native' || indicator.type === 'token') {
              if (indicator.to === walletAddress) {
                isVictim = true;
              }
              if (indicator.from === walletAddress) {
                isAttacker = true;
              }
            }
          }

          if (isVictim && !isAttacker) {
            result.role = 'VICTIM';
            victimCount++;
          } else if (isAttacker && !isVictim) {
            result.role = 'ATTACKER';
            attackerCount++;
          } else if (isVictim && isAttacker) {
            result.role = 'BOTH';
            victimCount++;
            attackerCount++;
          } else {
            result.role = 'UNKNOWN';
            unknownRoleCount++;
          }
        }

        // Stop if we've reached the maximum number of transactions
        if (analysisResults.length >= maxTransactions) {
          break;
        }
      }

      // Show progress
      process.stdout.write(`Analyzed ${analysisResults.length} transactions in time range\r`);
    }

    console.log('\n');  // Clear the progress line

    // Display results
    console.log('\n=== Analysis Results ===');
    console.log(`\nTime-Based Analysis for ${walletAddress}:`);
    console.log(`Time range: ${new Date(startTimestamp * 1000).toLocaleString()} to ${new Date(endTimestamp * 1000).toLocaleString()}`);
    console.log(`Transactions in time range: ${analysisResults.length}`);

    if (analysisResults.length === 0) {
      console.log('\nNo transactions found in the specified time range.');
      console.log('\n=== Analysis Complete ===');
      return;
    }

    console.log(`Dusting transactions: ${dustingCount} (${((dustingCount / analysisResults.length) * 100).toFixed(2)}% of transactions)`);

    if (dustingCount > 0) {
      // Display role summary
      console.log(`\nWallet Role Summary:`);
      if (victimCount > 0) {
        console.log(`- Victim of dusting in ${victimCount} transaction(s)`);
      }
      if (attackerCount > 0) {
        console.log(`- Sender of dusting in ${attackerCount} transaction(s)`);
      }
      if (unknownRoleCount > 0) {
        console.log(`- Unclear role in ${unknownRoleCount} transaction(s)`);
      }

      // Overall assessment
      console.log(`\nOverall Assessment:`);
      if (victimCount > 0 && attackerCount === 0) {
        console.log(`This wallet appears to be a VICTIM of dusting attacks during this time period.`);
      } else if (attackerCount > 0 && victimCount === 0) {
        console.log(`This wallet appears to be an ATTACKER performing dusting attacks during this time period.`);
      } else if (victimCount > 0 && attackerCount > 0) {
        console.log(`This wallet has both SENT and RECEIVED dusting transactions during this time period.`);
      } else {
        console.log(`Unable to determine this wallet's role in dusting activity during this time period.`);
      }

      console.log('\nPotential Dusting Attacks:');
      analysisResults.filter(r => r.isDusting).forEach((result, index) => {
        console.log(`\n${index + 1}. Transaction: ${result.signature.substring(0, 16)}...`);
        console.log(`   Type: ${result.type}`);
        console.log(`   Role: ${result.role || 'UNKNOWN'}`);
        console.log(`   Attack Vector: ${result.primaryAttackVector || 'UNKNOWN'}`);
        console.log(`   Description: ${result.description}`);
        console.log(`   Timestamp: ${new Date(result.timestamp * 1000).toLocaleString()}`);
      });
    } else {
      console.log('\nNo dusting attacks detected in this time range.');
    }

    console.log('\n=== Analysis Complete ===');
  } catch (error) {
    console.error('Error analyzing time range:', error);
  }
}

module.exports = {
  analyzeTimeRange
};
