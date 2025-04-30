/**
 * Transaction Analyzer for Solana Dusting Attack Detector
 *
 * This module provides functions for analyzing Solana transactions
 * to detect potential dusting attacks.
 */

const {
  makeApiRequest,
  makePublicRpcRequest
} = require('../api/api-helpers');

const { isVerifiedToken, isStablecoin } = require('../utils/token-whitelist');
const { calculateTokenValue } = require('../utils/token-price-fetcher');

/**
 * Analyze a transaction for dusting attacks
 * @param {string} signature - The transaction signature to analyze
 * @param {boolean} isTokenTransaction - Whether this is a token transaction
 * @param {string} specificTokenMint - Optional specific token mint to filter transfers by
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeTransaction(signature, isTokenTransaction = false, specificTokenMint = null) {
  let parseResponse = null;

  // For token transactions, try public RPC first to avoid parsing errors
  if (isTokenTransaction) {
    try {
      // Get transaction from public RPC
      const txResponse = await makePublicRpcRequest('getTransaction', [
        signature,
        { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }
      ]);

      if (txResponse && txResponse.result) {
        // Convert the public RPC format to something similar to Helius format
        const tx = txResponse.result;

        // Create a simplified transaction object
        const simplifiedTx = {
          signature: signature,
          timestamp: tx.blockTime || Math.floor(Date.now() / 1000),
          type: 'UNKNOWN', // Default type, we'll try to determine it below
          description: 'Transaction details from public RPC',
          nativeTransfers: [],
          tokenTransfers: []
        };

        // Try to determine transaction type from the transaction data
        if (tx.meta && tx.transaction && tx.transaction.message) {
          // Check program IDs to determine transaction type
          const programIds = tx.transaction.message.accountKeys
            .filter((_, i) => tx.transaction.message.isAccountSigner[i] === false)
            .map(key => key.toString());

          // Check for token program (SPL Token transfers)
          if (programIds.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')) {
            simplifiedTx.type = 'TOKEN_TRANSFER';
          }

          // Check for system program transfers (SOL transfers)
          if (programIds.includes('11111111111111111111111111111111')) {
            if (simplifiedTx.type === 'TOKEN_TRANSFER') {
              simplifiedTx.type = 'MIXED_TRANSFER'; // Both SOL and token transfers
            } else {
              simplifiedTx.type = 'SOL_TRANSFER';
            }
          }

          // Check for token swap programs
          const swapProgramIds = [
            'SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8', // Raydium
            'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1', // Orca
            'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'  // Jupiter
          ];

          if (swapProgramIds.some(id => programIds.includes(id))) {
            simplifiedTx.type = 'SWAP';
          }

          // Check for NFT marketplaces
          const nftMarketplaceIds = [
            'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K', // Magic Eden
            'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk'  // Tensor
          ];

          if (nftMarketplaceIds.some(id => programIds.includes(id))) {
            simplifiedTx.type = 'NFT_SALE';
          }
        }

        // Extract native transfers if available
        if (tx.meta && tx.meta.preBalances && tx.meta.postBalances && tx.transaction.message.accountKeys) {
          const accountKeys = tx.transaction.message.accountKeys;

          // Find accounts with decreased balances (potential senders)
          const senders = [];
          for (let i = 0; i < accountKeys.length; i++) {
            const preBalance = tx.meta.preBalances[i];
            const postBalance = tx.meta.postBalances[i];
            const balanceDiff = postBalance - preBalance;

            if (balanceDiff < 0) {
              senders.push({
                account: accountKeys[i],
                amount: Math.abs(balanceDiff)
              });
            }
          }

          // Find accounts with increased balances (recipients)
          for (let i = 0; i < accountKeys.length; i++) {
            const preBalance = tx.meta.preBalances[i];
            const postBalance = tx.meta.postBalances[i];
            const balanceDiff = postBalance - preBalance;

            if (balanceDiff > 0) {
              // Try to find a matching sender with the same amount
              let sender = 'Unknown';
              const senderMatch = senders.find(s => s.amount === balanceDiff);
              if (senderMatch) {
                sender = senderMatch.account;
              }

              simplifiedTx.nativeTransfers.push({
                fromUserAccount: sender,
                toUserAccount: accountKeys[i],
                amount: balanceDiff // This is in lamports
              });
            }
          }
        }

        // Extract token transfers if available
        if (tx.meta && tx.meta.postTokenBalances && tx.meta.preTokenBalances) {
          const preBalances = tx.meta.preTokenBalances || [];
          const postBalances = tx.meta.postTokenBalances || [];

          // Create maps for pre and post balances
          const preBalanceMap = {};
          const postBalanceMap = {};

          // Map pre-balances
          for (const balance of preBalances) {
            const key = `${balance.accountIndex}-${balance.mint}`;
            preBalanceMap[key] = {
              amount: balance.uiTokenAmount.uiAmount || 0,
              account: tx.transaction.message.accountKeys[balance.accountIndex],
              mint: balance.mint
            };
          }

          // Map post-balances
          for (const balance of postBalances) {
            const key = `${balance.accountIndex}-${balance.mint}`;
            postBalanceMap[key] = {
              amount: balance.uiTokenAmount.uiAmount || 0,
              account: tx.transaction.message.accountKeys[balance.accountIndex],
              mint: balance.mint
            };
          }

          // Find accounts with decreased token balances (potential senders)
          const tokenSenders = [];
          for (const key in preBalanceMap) {
            const preBalance = preBalanceMap[key];
            const postBalance = postBalanceMap[key] || { amount: 0 };
            const diff = preBalance.amount - postBalance.amount;

            if (diff > 0) {
              tokenSenders.push({
                account: preBalance.account,
                amount: diff,
                mint: preBalance.mint
              });
            }
          }

          // Find accounts with increased token balances (recipients)
          for (const key in postBalanceMap) {
            const postBalance = postBalanceMap[key];
            const preBalance = preBalanceMap[key] || { amount: 0 };
            const diff = postBalance.amount - preBalance.amount;

            if (diff > 0) {
              // Try to find a matching sender with the same amount and mint
              let sender = 'Unknown';
              const senderMatch = tokenSenders.find(s =>
                s.amount === diff && s.mint === postBalance.mint
              );

              if (senderMatch) {
                sender = senderMatch.account;
              }

              simplifiedTx.tokenTransfers.push({
                fromUserAccount: sender,
                toUserAccount: postBalance.account,
                tokenAmount: diff.toString(),
                mint: postBalance.mint
              });
            }
          }
        }

        parseResponse = [simplifiedTx];
      }
    } catch (error) {
      // Silent error, will try Helius API next
    }
  }

  // If public RPC failed or this is not a token transaction, try Helius API
  if (!parseResponse || !parseResponse[0]) {
    parseResponse = await makeApiRequest('/transactions', 'POST', {
      transactions: [signature],
    });

    // If Helius fails, try public RPC as fallback (if we haven't tried it already)
    if ((!parseResponse || !parseResponse[0]) && !isTokenTransaction) {
      // Silent fallback to public RPC

      try {
        // Get transaction from public RPC
        const txResponse = await makePublicRpcRequest('getTransaction', [
          signature,
          { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }
        ]);

        if (txResponse && txResponse.result) {
          // Convert the public RPC format to something similar to Helius format
          const tx = txResponse.result;

          // Create a simplified transaction object
          const simplifiedTx = {
            signature: signature,
            timestamp: tx.blockTime || Math.floor(Date.now() / 1000),
            type: 'UNKNOWN', // Default type, we'll try to determine it below
            description: 'Transaction details from public RPC',
            nativeTransfers: [],
            tokenTransfers: []
          };

          // Try to determine transaction type from the transaction data
          if (tx.meta && tx.transaction && tx.transaction.message) {
            try {
              // Check if accountKeys and isAccountSigner exist and are arrays
              if (Array.isArray(tx.transaction.message.accountKeys) &&
                  Array.isArray(tx.transaction.message.isAccountSigner)) {

                // Check program IDs to determine transaction type
                const programIds = tx.transaction.message.accountKeys
                  .filter((_, i) => i < tx.transaction.message.isAccountSigner.length &&
                                   tx.transaction.message.isAccountSigner[i] === false)
                  .map(key => key.toString());

                // Check for token program (SPL Token transfers)
                if (programIds.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')) {
                  simplifiedTx.type = 'TOKEN_TRANSFER';
                }
              } else {
                // Alternative approach if arrays aren't available
                // Just use all account keys as a fallback
                const programIds = tx.transaction.message.accountKeys ?
                  tx.transaction.message.accountKeys.map(key => key.toString()) : [];

                // Check for token program (SPL Token transfers)
                if (programIds.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')) {
                  simplifiedTx.type = 'TOKEN_TRANSFER';
                }
              }
            } catch (error) {
              // Silent error, continue with default type 'UNKNOWN'
            }

            try {
              // Get account keys as a fallback if not already defined in the previous try block
              const programIds = tx.transaction.message.accountKeys ?
                tx.transaction.message.accountKeys.map(key => key.toString()) : [];

              // Check for system program transfers (SOL transfers)
              if (programIds.includes('11111111111111111111111111111111')) {
                if (simplifiedTx.type === 'TOKEN_TRANSFER') {
                  simplifiedTx.type = 'MIXED_TRANSFER'; // Both SOL and token transfers
                } else {
                  simplifiedTx.type = 'SOL_TRANSFER';
                }
              }

              // Check for token swap programs
              const swapProgramIds = [
                'SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8', // Raydium
                'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1', // Orca
                'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'  // Jupiter
              ];

              if (swapProgramIds.some(id => programIds.includes(id))) {
                simplifiedTx.type = 'SWAP';
              }

              // Check for NFT marketplaces
              const nftMarketplaceIds = [
                'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K', // Magic Eden
                'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk'  // Tensor
              ];

              if (nftMarketplaceIds.some(id => programIds.includes(id))) {
                simplifiedTx.type = 'NFT_SALE';
              }
            } catch (error) {
              // Silent error, continue with current transaction type
            }
          }

          // Extract native transfers if available
          if (tx.meta && tx.meta.preBalances && tx.meta.postBalances && tx.transaction.message.accountKeys) {
            const accountKeys = tx.transaction.message.accountKeys;

            // Find accounts with decreased balances (potential senders)
            const senders = [];
            for (let i = 0; i < accountKeys.length; i++) {
              const preBalance = tx.meta.preBalances[i];
              const postBalance = tx.meta.postBalances[i];
              const balanceDiff = postBalance - preBalance;

              if (balanceDiff < 0) {
                senders.push({
                  account: accountKeys[i],
                  amount: Math.abs(balanceDiff)
                });
              }
            }

            // Find accounts with increased balances (recipients)
            for (let i = 0; i < accountKeys.length; i++) {
              const preBalance = tx.meta.preBalances[i];
              const postBalance = tx.meta.postBalances[i];
              const balanceDiff = postBalance - preBalance;

              if (balanceDiff > 0) {
                // Try to find a matching sender with the same amount
                let sender = 'Unknown';
                const senderMatch = senders.find(s => s.amount === balanceDiff);
                if (senderMatch) {
                  sender = typeof senderMatch.account === 'object' ? senderMatch.account.toString() : senderMatch.account;
                }

                simplifiedTx.nativeTransfers.push({
                  fromUserAccount: typeof sender === 'object' ? sender.toString() : sender,
                  toUserAccount: typeof accountKeys[i] === 'object' ? accountKeys[i].toString() : accountKeys[i],
                  amount: balanceDiff // This is in lamports
                });
              }
            }
          }

          // Extract token transfers if available
          if (tx.meta && tx.meta.postTokenBalances && tx.meta.preTokenBalances) {
            const preBalances = tx.meta.preTokenBalances || [];
            const postBalances = tx.meta.postTokenBalances || [];

            // Create maps for pre and post balances
            const preBalanceMap = {};
            const postBalanceMap = {};

            // Map pre-balances
            for (const balance of preBalances) {
              const key = `${balance.accountIndex}-${balance.mint}`;
              preBalanceMap[key] = {
                amount: balance.uiTokenAmount.uiAmount || 0,
                account: tx.transaction.message.accountKeys[balance.accountIndex],
                accountStr: typeof tx.transaction.message.accountKeys[balance.accountIndex] === 'object' ?
                  tx.transaction.message.accountKeys[balance.accountIndex].toString() :
                  tx.transaction.message.accountKeys[balance.accountIndex],
                mint: balance.mint
              };
            }

            // Map post-balances
            for (const balance of postBalances) {
              const key = `${balance.accountIndex}-${balance.mint}`;
              postBalanceMap[key] = {
                amount: balance.uiTokenAmount.uiAmount || 0,
                account: tx.transaction.message.accountKeys[balance.accountIndex],
                accountStr: typeof tx.transaction.message.accountKeys[balance.accountIndex] === 'object' ?
                  tx.transaction.message.accountKeys[balance.accountIndex].toString() :
                  tx.transaction.message.accountKeys[balance.accountIndex],
                mint: balance.mint
              };
            }

            // Find accounts with decreased token balances (potential senders)
            const tokenSenders = [];
            for (const key in preBalanceMap) {
              const preBalance = preBalanceMap[key];
              const postBalance = postBalanceMap[key] || { amount: 0 };
              const diff = preBalance.amount - postBalance.amount;

              if (diff > 0) {
                tokenSenders.push({
                  account: preBalance.accountStr || (typeof preBalance.account === 'object' ? preBalance.account.toString() : preBalance.account),
                  amount: diff,
                  mint: preBalance.mint
                });
              }
            }

            // Find accounts with increased token balances (recipients)
            for (const key in postBalanceMap) {
              const postBalance = postBalanceMap[key];
              const preBalance = preBalanceMap[key] || { amount: 0 };
              const diff = postBalance.amount - preBalance.amount;

              if (diff > 0) {
                // Try to find a matching sender with the same amount and mint
                let sender = 'Unknown';

                // For TOKEN_MINT transactions, use the mint authority as the sender
                if (tx.type === 'TOKEN_MINT' && tx.description && tx.description.includes('minted')) {
                  // Extract the minter address from the description if possible
                  const minterMatch = tx.description.match(/([1-9A-HJ-NP-Za-km-z]{32,44}) minted/);
                  if (minterMatch && minterMatch[1]) {
                    sender = minterMatch[1];
                  } else {
                    sender = 'Token Minter';
                  }
                } else {
                  // For regular transfers, try to find the sender
                  const senderMatch = tokenSenders.find(s =>
                    s.amount === diff && s.mint === postBalance.mint
                  );

                  if (senderMatch) {
                    sender = typeof senderMatch.account === 'object' ? senderMatch.account.toString() : senderMatch.account;
                  }
                }

                simplifiedTx.tokenTransfers.push({
                  fromUserAccount: typeof sender === 'object' ? sender.toString() : sender,
                  toUserAccount: postBalance.accountStr || (typeof postBalance.account === 'object' ? postBalance.account.toString() : postBalance.account),
                  tokenAmount: diff.toString(),
                  mint: postBalance.mint
                });
              }
            }
          }

          parseResponse = [simplifiedTx];
        }
      } catch (error) {
        // Silent error, will return error object
      }
    }
  }

  // If we still don't have transaction data, return error
  if (!parseResponse || !parseResponse[0]) {
    return {
      isDusting: false,
      details: 'Error parsing transaction or transaction not found'
    };
  }

  const tx = parseResponse[0];
  const dustingIndicators = [];
  let isDusting = false;

  // We'll keep the UNKNOWN type as is for simplicity

  // Skip BURN and SWAP transactions - they're not dusting attacks
  if (tx.type === 'BURN' || tx.type === 'SWAP') {
    return {
      signature,
      timestamp: tx.timestamp,
      type: tx.type,
      description: tx.description,
      isDusting: false,
      reason: `${tx.type} transactions are not considered dusting attacks`
    };
  }

  // Skip other transaction types that are unlikely to be dusting attacks
  const nonDustingTypes = ['VOTE', 'STAKE', 'UNSTAKE', 'DELEGATE'];
  if (nonDustingTypes.includes(tx.type)) {
    return {
      signature,
      timestamp: tx.timestamp,
      type: tx.type,
      description: tx.description,
      isDusting: false,
      reason: `${tx.type} transactions are typically not dusting attacks`
    };
  }

  // Check for native transfers (SOL)
  if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
    tx.nativeTransfers.forEach(transfer => {
      const solAmount = transfer.amount / 1000000000; // Convert lamports to SOL
      if (solAmount < 0.001) {
        isDusting = true;
        dustingIndicators.push({
          type: 'native',
          from: transfer.fromUserAccount || 'Unknown',
          to: transfer.toUserAccount || 'Unknown',
          amount: solAmount,
          reason: `Very small SOL transfer (${solAmount} SOL)`
        });
      }
    });
  }

  // Check for token transfers
  if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
    // If we have a specific token mint to filter by, only analyze transfers for that token
    let relevantTransfers = tx.tokenTransfers;

    if (specificTokenMint) {
      relevantTransfers = tx.tokenTransfers.filter(transfer =>
        transfer.mint === specificTokenMint
      );

      // If we're analyzing a specific token but there are no transfers of that token,
      // then this transaction isn't relevant for dusting analysis of this token
      if (relevantTransfers.length === 0) {
        return {
          signature,
          timestamp: tx.timestamp,
          type: tx.type,
          description: tx.description,
          isDusting: false,
          reason: `No transfers of the specified token (${specificTokenMint}) in this transaction`
        };
      }

      // If we're analyzing a specific token and it's a verified stablecoin,
      // don't flag it as a dusting attack regardless of amount
      if (await isStablecoin(specificTokenMint)) {
        return {
          signature,
          timestamp: tx.timestamp,
          type: tx.type,
          description: tx.description,
          isDusting: false,
          reason: `This is a verified stablecoin and not considered for dusting attacks`
        };
      }
    }

    // Limit the number of token transfers we analyze to prevent overwhelming output
    const maxTransfersToShow = 5;
    const transfers = relevantTransfers.slice(0, maxTransfersToShow);

    // Process each transfer
    for (const transfer of transfers) {
      // Skip NFT transfers with amount 1 - these are likely legitimate NFT transfers, not dusting
      const isLikelyNFT = transfer.tokenAmount === "1" && tx.description &&
                         (tx.description.includes("NFT") ||
                          tx.description.includes("Collectible") ||
                          tx.description.toLowerCase().includes("transferred 1 "));

      if (isLikelyNFT) {
        continue; // Skip NFT transfers
      }

      // Skip verified stablecoins
      const tokenMint = transfer.mint;
      const isStable = await isStablecoin(tokenMint);

      if (isStable) {
        continue; // Skip stablecoins
      }

      // Use enhanced token analysis to determine if this is dust
      try {
        // Convert token amount to a number
        const tokenAmount = parseFloat(transfer.tokenAmount);

        // Get token value and dusting risk assessment
        const tokenAnalysis = await calculateTokenValue(tokenMint, tokenAmount);

        // If the token analysis indicates this is dust, flag it
        if (tokenAnalysis.isDust) {
          isDusting = true;

          // Create a detailed reason based on the analysis
          let reason = '';

          if (tokenAnalysis.valueUSD !== null) {
            // Value-based reason
            reason = `Low value transfer (${tokenAnalysis.valueUSD.toFixed(4)} USD)`;

            if (tokenAnalysis.isLikelyScam) {
              reason += ` of likely scam token (scam score: ${tokenAnalysis.scamScore})`;
            }
          } else {
            // Amount-based reason with metadata analysis
            reason = `Small token amount (${tokenAmount})`;

            if (tokenAnalysis.isLikelyScam) {
              reason += ` of likely scam token (scam score: ${tokenAnalysis.scamScore})`;
            } else if (tokenAnalysis.suspiciousIndicators && tokenAnalysis.suspiciousIndicators.length > 0) {
              // Add the first suspicious indicator
              reason += ` with suspicious metadata: ${tokenAnalysis.suspiciousIndicators[0]}`;
            }
          }

          // Add the indicator
          dustingIndicators.push({
            type: 'token',
            from: transfer.fromUserAccount || 'Unknown',
            to: transfer.toUserAccount || 'Unknown',
            token: transfer.mint,
            amount: transfer.tokenAmount,
            valueUSD: tokenAnalysis.valueUSD,
            scamScore: tokenAnalysis.scamScore || 0,
            suspiciousIndicators: tokenAnalysis.suspiciousIndicators || [],
            reason
          });
        }
      } catch (error) {
        console.log(`Error analyzing token value for ${tokenMint}: ${error.message}`);

        // Fallback to simple amount-based detection if token analysis fails
        const tokenAmount = parseFloat(transfer.tokenAmount);
        const isVerified = await isVerifiedToken(tokenMint);

        if (tokenAmount <= 1 && (!isVerified || tokenAmount < 0.0001)) {
          isDusting = true;
          dustingIndicators.push({
            type: 'token',
            from: transfer.fromUserAccount || 'Unknown',
            to: transfer.toUserAccount || 'Unknown',
            token: transfer.mint,
            amount: transfer.tokenAmount,
            reason: `Minimal token amount (${transfer.tokenAmount})${isVerified ? ' of verified token' : ''} (fallback detection)`
          });
        }
      }
    }

    // If there are more transfers than we're showing, add a note
    if (relevantTransfers.length > maxTransfersToShow) {
      const additionalCount = relevantTransfers.length - maxTransfersToShow;
      dustingIndicators.push({
        type: 'info',
        reason: `... and ${additionalCount} more similar token transfers (not shown for brevity)`
      });
    }
  }

  // Check for memos (often contain scam links or promotional messages)
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
          // Check for suspicious content in the memo
          const suspiciousTerms = [
            'airdrop', 'claim', 'free', 'winner', 'reward', 'bonus', 'giveaway',
            'limited', 'exclusive', 'congratulations', 'selected', 'promo', 'promotion',
            'offer', 'discount', 'special', 'gift', 'prize', 'won', 'earn', 'profit',
            'investment', 'crypto', 'token', 'nft', 'mint', 'whitelist'
          ];

          // Check for URLs in the memo
          const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|io|org|net|xyz|app))/gi;
          const containsUrl = urlRegex.test(memoText);

          // Check for suspicious terms
          const lowerMemo = memoText.toLowerCase();
          const foundTerms = suspiciousTerms.filter(term => lowerMemo.includes(term));

          // Score the memo based on suspicious indicators
          let suspiciousScore = 0;
          if (containsUrl) suspiciousScore += 3; // URLs are highly suspicious
          suspiciousScore += foundTerms.length; // Each suspicious term adds to the score

          // If the memo is suspicious, add it as an indicator
          if (suspiciousScore > 0 || containsUrl) {
            isDusting = true;

            let reason = 'Suspicious memo';
            if (containsUrl) reason += ' containing URL';
            if (foundTerms.length > 0) {
              reason += ` with suspicious terms: ${foundTerms.join(', ')}`;
            }

            dustingIndicators.push({
              type: 'memo',
              content: memoText,
              suspiciousScore,
              reason
            });
          }
        }
      }
    }
  }

  // Determine the primary attack vector if it's a dusting attack
  let primaryAttackVector = undefined;

  if (isDusting) {
    let hasNativeTransfer = false;
    let hasTokenTransfer = false;
    let hasMemo = false;

    for (const indicator of dustingIndicators) {
      if (indicator.type === 'native') hasNativeTransfer = true;
      else if (indicator.type === 'token') hasTokenTransfer = true;
      else if (indicator.type === 'memo') hasMemo = true;
    }

    // Set the primary attack vector
    if (hasNativeTransfer && hasTokenTransfer) {
      primaryAttackVector = 'MIXED_DUST';
    } else if (hasNativeTransfer) {
      primaryAttackVector = 'SOL_DUST';
    } else if (hasTokenTransfer) {
      primaryAttackVector = 'TOKEN_DUST';
    } else if (hasMemo) {
      primaryAttackVector = 'MEMO_SCAM';
    } else {
      primaryAttackVector = 'UNKNOWN';
    }
  }

  // Calculate risk score based on indicators
  let riskScore = 0;
  let riskLevel = 'LOW';

  if (isDusting) {
    // Base score for being a dusting attack
    riskScore += 30;

    // Add points for each indicator
    for (const indicator of dustingIndicators) {
      // Add points based on indicator type
      if (indicator.type === 'native') {
        riskScore += 10; // SOL dust
      } else if (indicator.type === 'token') {
        riskScore += 20; // Token dust is often more suspicious

        // Add points for suspicious token metadata
        if (indicator.scamScore) {
          riskScore += Math.min(indicator.scamScore / 2, 25); // Cap at 25 points
        }

        // Add points for suspicious indicators
        if (indicator.suspiciousIndicators && indicator.suspiciousIndicators.length > 0) {
          riskScore += indicator.suspiciousIndicators.length * 5;
        }
      } else if (indicator.type === 'memo') {
        riskScore += 15; // Suspicious memos

        // Add points for suspicious score
        if (indicator.suspiciousScore) {
          riskScore += indicator.suspiciousScore * 3;
        }
      }
    }

    // Determine risk level based on score
    if (riskScore >= 70) {
      riskLevel = 'VERY HIGH';
    } else if (riskScore >= 50) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 30) {
      riskLevel = 'MEDIUM';
    }
  }

  // Create the result object with risk assessment
  return {
    signature,
    timestamp: tx.timestamp,
    type: tx.type,
    description: tx.description,
    isDusting,
    dustingIndicators,
    primaryAttackVector,
    riskScore,
    riskLevel
  };
}

/**
 * Analyze a single transaction and display results
 * @param {string} signature - The transaction signature to analyze
 */
async function analyzeSingleTransaction(signature) {
  console.log(`\n=== Solana Transaction Analysis ===`);
  console.log(`Analyzing transaction: ${signature}`);
  console.log('======================================\n');

  // Analyze the transaction
  console.log('Fetching and analyzing transaction...');
  const result = await analyzeTransaction(signature);

  if (!result || result.details) {
    console.log(`Error: ${result?.details || 'Transaction not found or could not be analyzed'}`);
    return;
  }

  // Display results
  console.log('\n=== Analysis Results ===');

  console.log(`\nTransaction Details:`);
  console.log(`Signature: ${result.signature}`);
  console.log(`Type: ${result.type}`);
  console.log(`Description: ${result.description}`);
  console.log(`Timestamp: ${new Date(result.timestamp * 1000).toLocaleString()}`);

  if (result.isDusting) {
    console.log(`\nDusting Attack Detected: YES`);

    // Display risk level if available
    if (result.riskLevel) {
      console.log(`Risk Level: ${result.riskLevel}${result.riskScore ? ` (Score: ${result.riskScore})` : ''}`);
    }

    // Describe the attack vector
    let vectorDescription = '';
    switch(result.primaryAttackVector) {
      case 'SOL_DUST':
        vectorDescription = 'Small SOL transfers (classic dusting)';
        break;
      case 'TOKEN_DUST':
        vectorDescription = 'Small token transfers (token dusting)';
        break;
      case 'MIXED_DUST':
        vectorDescription = 'Both SOL and token transfers';
        break;
      case 'MEMO_SCAM':
        vectorDescription = 'Suspicious memo content';
        break;
      default:
        vectorDescription = 'Unknown attack type';
    }

    console.log(`Primary Attack Vector: ${result.primaryAttackVector || 'UNKNOWN'} - ${vectorDescription}`);

    if (result.attackTypes && result.attackTypes.length > 0) {
      console.log(`Attack Types: ${result.attackTypes.join(', ')}`);
    }

    console.log('\nSuspicious Indicators:');
    for (let index = 0; index < result.dustingIndicators.length; index++) {
      const indicator = result.dustingIndicators[index];
      console.log(`\n${index + 1}. ${indicator.reason}`);

      // Display based on indicator type
      if (indicator.type === 'native' || indicator.type === 'token') {
        // For native and token transfers
        if (indicator.from) {
          if (indicator.from === 'Unknown' && result.type === 'TOKEN_MINT') {
            console.log(`   From: Token Mint (New Token Creation)`);
          } else {
            console.log(`   From: ${indicator.from}`);
          }
        }
        if (indicator.to) console.log(`   To: ${indicator.to}`);

        if (indicator.type === 'native') {
          console.log(`   Amount: ${indicator.amount} SOL`);
          // Calculate USD value of SOL if possible
          try {
            const solPrice = 100; // Approximate SOL price in USD - could be fetched dynamically
            const solValue = indicator.amount * solPrice;
            console.log(`   Value: $${solValue.toFixed(4)} USD (approx.)`);
          } catch (error) {
            // Skip value display if calculation fails
          }
        } else if (indicator.type === 'token') {
          console.log(`   Token: ${indicator.token}`);
          console.log(`   Amount: ${indicator.amount}`);

          // Show USD value if available
          if (indicator.valueUSD !== null) {
            console.log(`   Value: $${indicator.valueUSD.toFixed(4)} USD`);
          } else {
            console.log(`   Value: $0.0000 USD (price data unavailable)`);
          }

          // Show scam score if available
          if (indicator.scamScore > 0) {
            console.log(`   Scam Score: ${indicator.scamScore} (higher = more suspicious)`);
          }

          // Show suspicious indicators if available
          if (indicator.suspiciousIndicators && indicator.suspiciousIndicators.length > 0) {
            console.log(`   Suspicious Indicators: ${indicator.suspiciousIndicators.slice(0, 2).join(', ')}${
              indicator.suspiciousIndicators.length > 2 ? ` and ${indicator.suspiciousIndicators.length - 2} more` : ''
            }`);
          }
        }
      } else if (indicator.type === 'memo') {
        // For memo indicators
        console.log(`   Memo content: "${indicator.content}"`);
        console.log(`   Suspicious score: ${indicator.suspiciousScore} (higher = more suspicious)`);
      }
    }
  } else {
    console.log(`\nDusting Attack Detected: NO`);
    if (result.reason) {
      console.log(result.reason);
    } else {
      console.log('No suspicious indicators found in this transaction.');
    }
  }

  // Add recommendations
  if (result.isDusting) {
    console.log('\n⚠️ Recommendations:');
    if (result.primaryAttackVector === 'TOKEN_DUST') {
      console.log('1. Avoid interacting with these suspicious tokens');
      console.log('2. Do not click on any links in token metadata');
      console.log('3. Consider using a burner wallet to isolate suspicious assets');
    } else if (result.primaryAttackVector === 'SOL_DUST') {
      console.log('1. Be cautious of small SOL transfers from unknown sources');
      console.log('2. Monitor your wallet for further suspicious activity');
    } else if (result.primaryAttackVector === 'MEMO_SCAM') {
      console.log('1. Never click on links in transaction memos');
      console.log('2. Ignore promotional messages in transaction memos');
    } else {
      console.log('1. Be cautious when interacting with addresses involved in this transaction');
      console.log('2. Monitor your wallet for further suspicious activity');
    }
  }

  console.log('\n=== Analysis Complete ===');
}

module.exports = {
  analyzeTransaction,
  analyzeSingleTransaction
};
