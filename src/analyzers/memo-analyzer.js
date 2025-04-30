/**
 * Memo Analyzer for Solana Dusting Attack Detector
 *
 * This module provides functions for analyzing Solana transaction memos
 * to detect potential scams and phishing attempts.
 */

const {
  makeApiRequest,
  makePublicRpcRequest
} = require('../api/api-helpers');

/**
 * List of suspicious terms commonly found in scam memos
 */
const SUSPICIOUS_TERMS = [
  'airdrop', 'claim', 'free', 'winner', 'reward', 'bonus', 'giveaway',
  'limited', 'exclusive', 'congratulations', 'selected', 'promo', 'promotion',
  'offer', 'discount', 'special', 'gift', 'prize', 'won', 'earn', 'profit',
  'investment', 'crypto', 'token', 'nft', 'mint', 'whitelist'
];

/**
 * Regex pattern to detect URLs in memo text
 */
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|io|org|net|xyz|app))/gi;

/**
 * Analyze a memo text for suspicious content
 * @param {string} memoText - The memo text to analyze
 * @returns {Object} Analysis results
 */
function analyzeMemoText(memoText) {
  if (!memoText || typeof memoText !== 'string') {
    return {
      isSuspicious: false,
      suspiciousScore: 0,
      foundTerms: [],
      containsUrl: false,
      urls: [],
      reason: 'Empty or invalid memo text'
    };
  }

  // Check for URLs in the memo
  const containsUrl = URL_REGEX.test(memoText);

  // Reset regex lastIndex to find all URLs
  URL_REGEX.lastIndex = 0;
  const urls = [];
  let match;
  while ((match = URL_REGEX.exec(memoText)) !== null) {
    urls.push(match[0]);
  }

  // Check for suspicious terms
  const lowerMemo = memoText.toLowerCase();
  const foundTerms = SUSPICIOUS_TERMS.filter(term => lowerMemo.includes(term));

  // Score the memo based on suspicious indicators
  let suspiciousScore = 0;
  if (containsUrl) suspiciousScore += 3; // URLs are highly suspicious
  suspiciousScore += foundTerms.length; // Each suspicious term adds to the score

  // Determine if the memo is suspicious
  const isSuspicious = suspiciousScore > 0 || containsUrl;

  // Generate reason text
  let reason = isSuspicious ? 'Suspicious memo' : 'No suspicious indicators found';
  if (containsUrl) reason += ' containing URL';
  if (foundTerms.length > 0) {
    reason += ` with suspicious terms: ${foundTerms.join(', ')}`;
  }

  return {
    isSuspicious,
    suspiciousScore,
    foundTerms,
    containsUrl,
    urls,
    reason
  };
}

/**
 * Analyze a transaction for memo content
 * @param {string} signature - The transaction signature to analyze
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeMemo(signature) {
  console.log(`\n=== Solana Memo Analysis ===`);
  console.log(`Analyzing transaction: ${signature}`);
  console.log('======================================\n');

  try {
    // First try Helius enhanced API
    let tx = null;
    try {
      const response = await makeApiRequest('/v0/transactions', 'POST', {
        transactions: [signature]
      });

      if (response && Array.isArray(response) && response.length > 0) {
        tx = response[0];
      }
    } catch (error) {
      console.log('Error fetching transaction from Helius API, trying public RPC...');
    }

    // If Helius fails, try public RPC
    if (!tx) {
      try {
        const txResponse = await makePublicRpcRequest('getTransaction', [
          signature,
          { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }
        ]);

        if (txResponse && txResponse.result) {
          tx = txResponse.result;
        }
      } catch (error) {
        console.error('Error fetching transaction from public RPC:', error);
        throw new Error('Failed to fetch transaction data');
      }
    }

    if (!tx) {
      throw new Error('Transaction not found');
    }

    // Extract memo instructions
    const memoResults = [];

    // Handle Helius parsed format
    if (tx.instructions) {
      for (const instruction of tx.instructions) {
        // Check if this is a memo instruction
        if (instruction.programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' ||
            instruction.programId === 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo') {

          // Extract the memo text
          let memoText = '';
          if (instruction.data) {
            try {
              // Attempt to decode the base58 data
              memoText = Buffer.from(instruction.data, 'base64').toString('utf8');
            } catch (e) {
              // If decoding fails, use the raw data
              memoText = instruction.data;
            }
          }

          if (memoText) {
            const analysis = analyzeMemoText(memoText);
            memoResults.push({
              memoText,
              ...analysis
            });
          }
        }
      }
    }

    // Handle RPC format if needed
    else if (tx.transaction && tx.transaction.message && tx.transaction.message.instructions) {
      for (const instruction of tx.transaction.message.instructions) {
        // Try to identify memo program
        const programId = tx.transaction.message.accountKeys[instruction.programIndex];
        if (programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' ||
            programId === 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo') {

          // Extract the memo text
          let memoText = '';
          if (instruction.data) {
            try {
              // Attempt to decode the base58 data
              memoText = Buffer.from(instruction.data, 'base58').toString('utf8');
            } catch (e) {
              // If decoding fails, use the raw data
              memoText = instruction.data;
            }
          }

          if (memoText) {
            const analysis = analyzeMemoText(memoText);
            memoResults.push({
              memoText,
              ...analysis
            });
          }
        }
      }
    }

    // Determine overall risk level
    let overallRiskScore = 0;
    let overallRiskLevel = 'LOW';
    let hasSuspiciousMemo = false;

    for (const result of memoResults) {
      if (result.isSuspicious) {
        hasSuspiciousMemo = true;
        overallRiskScore += result.suspiciousScore;
      }
    }

    // Determine risk level based on score
    if (overallRiskScore >= 10) {
      overallRiskLevel = 'VERY HIGH';
    } else if (overallRiskScore >= 7) {
      overallRiskLevel = 'HIGH';
    } else if (overallRiskScore >= 4) {
      overallRiskLevel = 'MEDIUM';
    }

    // Print analysis results
    console.log(`Transaction: ${signature}`);

    if (memoResults.length === 0) {
      console.log('No memo instructions found in this transaction');
    } else {
      console.log(`Found ${memoResults.length} memo instruction(s)`);

      memoResults.forEach((result, index) => {
        console.log(`\nMemo #${index + 1}:`);
        console.log(`Content: "${result.memoText}"`);
        console.log(`Suspicious: ${result.isSuspicious ? 'YES' : 'NO'}`);

        if (result.isSuspicious) {
          console.log(`Suspicious Score: ${result.suspiciousScore}`);

          if (result.containsUrl) {
            console.log(`Contains URLs: ${result.urls.join(', ')}`);
          }

          if (result.foundTerms.length > 0) {
            console.log(`Suspicious Terms: ${result.foundTerms.join(', ')}`);
          }

          console.log(`Reason: ${result.reason}`);
        }
      });

      if (hasSuspiciousMemo) {
        console.log(`\nOverall Risk Level: ${overallRiskLevel} (Score: ${overallRiskScore})`);

        console.log('\n⚠️ Recommendations:');
        console.log('1. Never click on links in transaction memos');
        console.log('2. Ignore promotional messages in transaction memos');
        console.log('3. Be cautious of transactions containing suspicious memos');
      }
    }

    console.log('\n=== Analysis Complete ===');

    // Return the analysis results
    return {
      signature,
      memoCount: memoResults.length,
      memos: memoResults,
      hasSuspiciousMemo,
      overallRiskScore,
      overallRiskLevel
    };
  } catch (error) {
    console.error('Error analyzing memo:', error);
    throw error;
  }
}

/**
 * Analyze a list of memos directly
 * @param {Array<string>} memoTexts - Array of memo texts to analyze
 * @returns {Object} - Analysis results
 */
function analyzeMemoList(memoTexts) {
  if (!Array.isArray(memoTexts)) {
    throw new Error('memoTexts must be an array of strings');
  }

  console.log(`\n=== Solana Memo Batch Analysis ===`);
  console.log(`Analyzing ${memoTexts.length} memos`);
  console.log('======================================\n');

  const memoResults = [];
  let overallRiskScore = 0;
  let hasSuspiciousMemo = false;

  for (const memoText of memoTexts) {
    const analysis = analyzeMemoText(memoText);
    memoResults.push({
      memoText,
      ...analysis
    });

    if (analysis.isSuspicious) {
      hasSuspiciousMemo = true;
      overallRiskScore += analysis.suspiciousScore;
    }
  }

  // Determine risk level based on score
  let overallRiskLevel = 'LOW';
  if (overallRiskScore >= 10) {
    overallRiskLevel = 'VERY HIGH';
  } else if (overallRiskScore >= 7) {
    overallRiskLevel = 'HIGH';
  } else if (overallRiskScore >= 4) {
    overallRiskLevel = 'MEDIUM';
  }

  // Print analysis results
  if (memoResults.length === 0) {
    console.log('No memos provided for analysis');
  } else {
    console.log(`Analyzed ${memoResults.length} memo(s)`);

    memoResults.forEach((result, index) => {
      console.log(`\nMemo #${index + 1}:`);
      console.log(`Content: "${result.memoText}"`);
      console.log(`Suspicious: ${result.isSuspicious ? 'YES' : 'NO'}`);

      if (result.isSuspicious) {
        console.log(`Suspicious Score: ${result.suspiciousScore}`);

        if (result.containsUrl) {
          console.log(`Contains URLs: ${result.urls.join(', ')}`);
        }

        if (result.foundTerms.length > 0) {
          console.log(`Suspicious Terms: ${result.foundTerms.join(', ')}`);
        }

        console.log(`Reason: ${result.reason}`);
      }
    });

    if (hasSuspiciousMemo) {
      console.log(`\nOverall Risk Level: ${overallRiskLevel} (Score: ${overallRiskScore})`);

      console.log('\n⚠️ Recommendations:');
      console.log('1. Never click on links in transaction memos');
      console.log('2. Ignore promotional messages in transaction memos');
      console.log('3. Be cautious of transactions containing suspicious memos');
    }
  }

  console.log('\n=== Analysis Complete ===');

  // Return the analysis results
  return {
    memoCount: memoResults.length,
    memos: memoResults,
    hasSuspiciousMemo,
    overallRiskScore,
    overallRiskLevel
  };
}

module.exports = {
  analyzeMemo,
  analyzeMemoText,
  analyzeMemoList
};
