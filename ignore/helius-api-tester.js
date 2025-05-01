/**
 * Helius API Tester
 *
 * This script tests various Helius API endpoints for Solana blockchain.
 * Create a config.js file based on config.example.js with your API key.
 */

// Try to load config file, use placeholder if not found
//let HELIUS_API_KEY = '';
// try {
//   const config = require('./config');
//   HELIUS_API_KEY = config.HELIUS_API_KEY;
// } catch (error) {
//   console.warn('Config file not found or invalid. Please create a config.js file based on config.example.js');
//   console.warn('Using placeholder API key - tests will fail until you provide a valid key\n');
// }
import { HELIUS_API_KEY } from './config';
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_API_URL = `https://api.helius.xyz/v0`;

// Helper function to make JSON-RPC requests
async function makeRpcRequest(method, params = []) {
  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making RPC request to ${method}:`, error);
    return null;
  }
}

// Helper function to make API requests
async function makeApiRequest(endpoint, method = 'GET', body = null) {
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

    const url = `${HELIUS_API_URL}${endpoint}?api-key=${HELIUS_API_KEY}`;
    const response = await fetch(url, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making API request to ${endpoint}:`, error);
    return null;
  }
}

// Test RPC endpoints
async function testRpcEndpoints() {
  console.log('Testing RPC Endpoints...\n');

  // Test getHealth
  console.log('Testing getHealth...');
  const healthResponse = await makeRpcRequest('getHealth');
  console.log('Health Response:', healthResponse);
  console.log('-----------------------------------\n');

  // Test getVersion
  console.log('Testing getVersion...');
  const versionResponse = await makeRpcRequest('getVersion');
  console.log('Version Response:', versionResponse);
  console.log('-----------------------------------\n');

  // Test getBalance for a known address
  const testAddress = 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg'; // Solana Foundation address
  console.log(`Testing getBalance for address: ${testAddress}...`);
  const balanceResponse = await makeRpcRequest('getBalance', [testAddress]);
  console.log('Balance Response:', balanceResponse);
  console.log('-----------------------------------\n');

  // Test getLatestBlockhash
  console.log('Testing getLatestBlockhash...');
  const blockhashResponse = await makeRpcRequest('getLatestBlockhash');
  console.log('Latest Blockhash Response:', blockhashResponse);
  console.log('-----------------------------------\n');

  // Test getSlot
  console.log('Testing getSlot...');
  const slotResponse = await makeRpcRequest('getSlot');
  console.log('Slot Response:', slotResponse);
  console.log('-----------------------------------\n');
}

// Test Enhanced Transactions API for Spam Detection
async function testEnhancedTransactionsApi() {
  console.log('Testing Enhanced Transactions API for Spam Detection...\n');

  // Example transaction signatures (replace with real ones for better testing)
  // Ideally, include examples of:
  // 1. Normal transaction
  // 2. Potential dusting attack (very small value transfers)
  // 3. Potential address poisoning (suspicious token transfers)
  const exampleTxSignatures = [
    // Example transaction (replace with a real one)
    '4jzQxVTaJ4Fe4Fct9y1aaT9hmVyEjpCqE2bL8JMnuLZbzHZwaL4kZZvNEZ6bEj6fGmiAdCPjmNQHCf8v994PAgDf'
  ];

  for (const signature of exampleTxSignatures) {
    console.log(`\nTesting Parse Transaction for signature: ${signature}...`);
    const parseResponse = await makeApiRequest('/transactions', 'POST', {
      transactions: [signature],
    });

    if (parseResponse && parseResponse[0]) {
      const tx = parseResponse[0];

      console.log('Transaction Type:', tx.type);
      console.log('Transaction Description:', tx.description);

      // Check for token transfers (important for address poisoning detection)
      if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        console.log('\nToken Transfers (important for address poisoning detection):');
        tx.tokenTransfers.forEach((transfer, i) => {
          console.log(`Transfer ${i+1}:`);
          console.log(`  From: ${transfer.fromUserAccount}`);
          console.log(`  To: ${transfer.toUserAccount}`);
          console.log(`  Token: ${transfer.mint}`);
          console.log(`  Amount: ${transfer.tokenAmount}`);
        });
      }

      // Check for native transfers (important for dusting attack detection)
      if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
        console.log('\nNative Transfers (important for dusting attack detection):');
        tx.nativeTransfers.forEach((transfer, i) => {
          console.log(`Transfer ${i+1}:`);
          console.log(`  From: ${transfer.fromUserAccount}`);
          console.log(`  To: ${transfer.toUserAccount}`);
          console.log(`  Amount: ${transfer.amount} lamports`);
          // Check if this might be a dusting attack (very small amount)
          const solAmount = transfer.amount / 1000000000; // Convert lamports to SOL
          if (solAmount < 0.001) {
            console.log(`  NOTE: Very small transfer (${solAmount} SOL) - potential dusting attack`);
          }
        });
      }

      // Full response for reference
      console.log('\nFull Parse Transaction Response:');
      console.log(JSON.stringify(parseResponse, null, 2));
    } else {
      console.log('Error parsing transaction or transaction not found');
    }

    console.log('-----------------------------------\n');
  }
}

// Test wallet token holdings for spam detection
async function testWalletTokens() {
  console.log('Testing Wallet Token Holdings for Spam Detection...\n');

  // Example wallet address (replace with a real one for better testing)
  const walletAddress = 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg';

  console.log(`Analyzing tokens owned by wallet: ${walletAddress}...`);

  // Get all tokens owned by the wallet
  const tokensResponse = await makeApiRequest(`/addresses/${walletAddress}/tokens`);

  if (tokensResponse && tokensResponse.tokens) {
    const tokens = Array.isArray(tokensResponse.tokens) ? tokensResponse.tokens : [];
    console.log(`\nFound ${tokens.length} tokens in wallet`);

    // Analyze tokens for spam indicators
    let suspiciousTokenCount = 0;

    for (const token of tokens) {
      let isSuspicious = false;
      const suspiciousReasons = [];

      // Check for very small token amounts (potential dusting)
      if (token.amount && parseFloat(token.amount) <= 1) {
        isSuspicious = true;
        suspiciousReasons.push('Minimal token amount (≤1)');
      }

      // Check token metadata for suspicious indicators
      if (token.name) {
        // Check for suspicious words in token name
        const suspiciousNameTerms = ['airdrop', 'claim', 'free', 'reward', 'bonus', 'support', 'verify'];
        const name = token.name.toLowerCase();

        for (const term of suspiciousNameTerms) {
          if (name.includes(term)) {
            isSuspicious = true;
            suspiciousReasons.push(`Name contains suspicious term: ${term}`);
            break;
          }
        }

        // Check for names similar to popular tokens
        const popularTokens = ['SOL', 'USDC', 'USDT', 'ETH', 'BTC', 'BONK'];
        const upperName = token.name.toUpperCase();

        for (const popularToken of popularTokens) {
          if (upperName.includes(popularToken) && upperName !== popularToken) {
            isSuspicious = true;
            suspiciousReasons.push(`Name similar to ${popularToken}`);
          }
        }

        // Check for website/URL in name
        if (name.includes('.com') || name.includes('.io') || name.includes('.org') || name.includes('http')) {
          isSuspicious = true;
          suspiciousReasons.push('Name contains URL');
        }
      }

      // Check for zero or very low supply tokens
      if (token.supply && parseFloat(token.supply) < 100) {
        isSuspicious = true;
        suspiciousReasons.push('Very low token supply');
      }

      if (isSuspicious) {
        suspiciousTokenCount++;
        console.log(`\nSuspicious Token #${suspiciousTokenCount}:`);
        console.log(`  Name: ${token.name || 'Unknown'}`);
        console.log(`  Symbol: ${token.symbol || 'Unknown'}`);
        console.log(`  Mint: ${token.address}`);
        console.log(`  Amount: ${token.amount}`);
        console.log(`  Suspicious indicators: ${suspiciousReasons.join(', ')}`);
      }
    }

    console.log(`\nSummary: Found ${suspiciousTokenCount} potentially suspicious tokens out of ${tokens.length} total tokens`);
  } else {
    console.log('Error retrieving token data or no tokens found');
  }

  console.log('-----------------------------------\n');
}

// Test NFT events for spam detection
async function testNftEvents() {
  console.log('Testing NFT Events for Spam Detection...\n');

  // Example wallet address (replace with a real one for better testing)
  const walletAddress = 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg';

  console.log(`Analyzing recent NFT events for address: ${walletAddress}...`);

  // Get recent NFT events for the wallet
  const nftEventsResponse = await makeApiRequest('/nft-events', 'POST', {
    query: {
      accounts: [walletAddress],
      types: ['NFT_MINT', 'NFT_TRANSFER_RECEIVED']
    },
    options: {
      limit: 10
    }
  });

  if (nftEventsResponse) {
    const events = Array.isArray(nftEventsResponse.result) ? nftEventsResponse.result :
                  (Array.isArray(nftEventsResponse) ? nftEventsResponse : []);
    console.log(`\nFound ${events.length} recent NFT events`);

    // Analyze NFT events for spam indicators
    let suspiciousEventCount = 0;

    for (const event of events) {
      let isSuspicious = false;
      const suspiciousReasons = [];

      // Check NFT metadata for suspicious indicators
      if (event.nft && event.nft.name) {
        const name = event.nft.name.toLowerCase();

        // Check for suspicious words in NFT name
        const suspiciousNameTerms = ['airdrop', 'claim', 'free', 'reward', 'bonus', 'support', 'verify', 'winner'];

        for (const term of suspiciousNameTerms) {
          if (name.includes(term)) {
            isSuspicious = true;
            suspiciousReasons.push(`Name contains suspicious term: ${term}`);
            break;
          }
        }

        // Check for website/URL in name
        if (name.includes('.com') || name.includes('.io') || name.includes('.org') || name.includes('http')) {
          isSuspicious = true;
          suspiciousReasons.push('Name contains URL');
        }
      }

      // Check if this is a mass airdrop (same NFT sent to many addresses)
      if (event.type === 'NFT_TRANSFER_RECEIVED' && event.source === 'UNKNOWN') {
        isSuspicious = true;
        suspiciousReasons.push('Received from unknown source');
      }

      if (isSuspicious) {
        suspiciousEventCount++;
        console.log(`\nSuspicious NFT Event #${suspiciousEventCount}:`);
        console.log(`  Type: ${event.type}`);
        console.log(`  NFT Name: ${event.nft?.name || 'Unknown'}`);
        console.log(`  NFT Mint: ${event.nft?.mint || 'Unknown'}`);
        console.log(`  Timestamp: ${new Date(event.timestamp * 1000).toISOString()}`);
        console.log(`  Suspicious indicators: ${suspiciousReasons.join(', ')}`);
      }
    }

    console.log(`\nSummary: Found ${suspiciousEventCount} potentially suspicious NFT events out of ${events.length} total events`);
  } else {
    console.log('Error retrieving NFT events or no events found');
  }

  console.log('-----------------------------------\n');
}

// Test account info for token analysis
async function testAccountInfo() {
  console.log('Testing Account Info for Token Analysis...\n');

  // Example token addresses (replace with real ones for better testing)
  const tokenAddresses = [
    // Example token address (replace with a real one)
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
  ];

  for (const address of tokenAddresses) {
    console.log(`\nAnalyzing token account: ${address}...`);

    // Get account info for the token
    const accountInfoResponse = await makeRpcRequest('getAccountInfo', [
      address,
      { encoding: 'jsonParsed' }
    ]);

    if (accountInfoResponse && accountInfoResponse.result && accountInfoResponse.result.value) {
      const accountInfo = accountInfoResponse.result.value;

      console.log('Account Owner:', accountInfo.owner);
      console.log('Account Data Program:', accountInfo.data?.program);

      // Check if this is a token account
      if (accountInfo.data?.program === 'spl-token') {
        const tokenData = accountInfo.data.parsed?.info;

        console.log('\nToken Account Data:');
        console.log('  Mint:', tokenData?.mint || 'undefined');
        console.log('  Owner:', tokenData?.owner || 'undefined');
        console.log('  Token Amount:', tokenData?.tokenAmount?.uiAmount || 'undefined');
        console.log('  Decimals:', tokenData?.tokenAmount?.decimals || 'undefined');

        // Check for suspicious indicators
        let isSuspicious = false;
        const suspiciousReasons = [];

        // Check if token is frozen
        if (tokenData.state === 'frozen') {
          isSuspicious = true;
          suspiciousReasons.push('Token account is frozen');
        }

        // Check for very small token amount
        if (tokenData.tokenAmount && parseFloat(tokenData.tokenAmount.uiAmount) <= 1) {
          isSuspicious = true;
          suspiciousReasons.push('Minimal token amount (≤1)');
        }

        if (isSuspicious) {
          console.log('\nWARNING: Suspicious token account detected');
          console.log('Suspicious indicators:', suspiciousReasons.join(', '));
        } else {
          console.log('\nNo suspicious indicators found for this token account');
        }
      } else {
        console.log('Not a token account or data format not recognized');
      }
    } else {
      console.log('Error retrieving account info or account not found');
    }

    console.log('-----------------------------------\n');
  }
}

// Test token account balance
async function testTokenAccountBalance() {
  console.log('Testing getTokenAccountBalance...\n');

  // Example token account address (replace with a real one for better testing)
  // Using a known USDC token account as an example
  const tokenAccountAddress = 'FYarNuMzTrXXyEMoWSvTJuAJz5XU9jRNyMYJ5ibnTrQ9';

  console.log(`Getting balance for token account: ${tokenAccountAddress}...`);

  // Get token account balance
  const balanceResponse = await makeRpcRequest('getTokenAccountBalance', [tokenAccountAddress]);

  if (balanceResponse && balanceResponse.result && balanceResponse.result.value) {
    const balance = balanceResponse.result.value;

    console.log('\nToken Account Balance:');
    console.log(`  Amount: ${balance.amount}`);
    console.log(`  UI Amount: ${balance.uiAmount}`);
    console.log(`  Decimals: ${balance.decimals}`);

    // Check for potential dusting (very small amount)
    if (balance.uiAmount <= 1) {
      console.log('\nWARNING: Very small token amount detected - potential dusting');
    }
  } else {
    console.log('Error retrieving token account balance or account not found');
  }

  console.log('-----------------------------------\n');
}

// Test get account info with base58 encoding
async function testGetAccountInfoBase58() {
  console.log('Testing getAccountInfo with base58 encoding...\n');

  // Example account address - using a known Solana account
  const accountAddress = 'SysvarC1ock11111111111111111111111111111111';

  console.log(`Getting account info for: ${accountAddress}...`);

  // Get account info with base58 encoding
  const accountInfoResponse = await makeRpcRequest('getAccountInfo', [
    accountAddress,
    { encoding: 'base58' }
  ]);

  if (accountInfoResponse && accountInfoResponse.result) {
    const accountInfo = accountInfoResponse.result;

    console.log('\nAccount Info:');
    if (accountInfo.value) {
      console.log(`  Owner: ${accountInfo.value.owner}`);
      console.log(`  Lamports: ${accountInfo.value.lamports}`);
      console.log(`  Executable: ${accountInfo.value.executable}`);
      console.log(`  Rent Epoch: ${accountInfo.value.rentEpoch}`);

      if (accountInfo.value.data) {
        console.log(`  Data: ${accountInfo.value.data[0].substring(0, 50)}... (truncated)`);
        console.log(`  Data Length: ${accountInfo.value.data[0].length} characters`);
      }
    } else {
      console.log('  Account not found or has no data');
    }
  } else {
    console.log('Error retrieving account info');
  }

  console.log('-----------------------------------\n');
}

// Main function to run all tests
async function runTests() {
  console.log('Starting Helius API Tests...\n');

  await testRpcEndpoints();
  await testEnhancedTransactionsApi();
  await testWalletTokens();
  await testNftEvents();
  await testAccountInfo();
  await testTokenAccountBalance();
  await testGetAccountInfoBase58();

  console.log('All tests completed!');
}

// Run the tests
runTests().catch(console.error);
