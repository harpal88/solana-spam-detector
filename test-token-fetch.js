/**
 * Simple test script to fetch token accounts for a wallet
 */

// Try to load config file, use placeholder if not found
let HELIUS_API_KEY = '';
try {
  const config = require('./config/config');
  HELIUS_API_KEY = config.HELIUS_API_KEY;
} catch (error) {
  console.error('Config file not found or invalid. Please create a config.js file based on config.example.js');
  console.error('Exiting...');
  process.exit(1);
}

async function fetchTokenAccounts(walletAddress) {
  console.log(`Fetching token accounts for wallet: ${walletAddress}`);
  
  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTokenAccountsByOwner",
        "params": [
          walletAddress,
          {
            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          },
          {
            "encoding": "jsonParsed"
          }
        ]
      })
    });

    const data = await response.json();
    
    if (!data || !data.result || !data.result.value) {
      console.log('No token accounts found or error retrieving token data');
      return;
    }
    
    // Process token accounts
    const tokenAccounts = data.result.value;
    console.log(`Found ${tokenAccounts.length} token accounts`);
    
    if (tokenAccounts.length === 0) {
      console.log('No tokens found in this wallet.');
      return;
    }
    
    // Extract token data from accounts
    let tokens = [];
    for (const account of tokenAccounts) {
      try {
        const parsedInfo = account.account.data.parsed.info;
        const tokenAmount = parsedInfo.tokenAmount;
        
        // Only include tokens with non-zero balance
        if (tokenAmount.uiAmount > 0) {
          tokens.push({
            mint: parsedInfo.mint,
            amount: tokenAmount.uiAmount,
            decimals: tokenAmount.decimals
          });
        }
      } catch (error) {
        console.log(`Error parsing token account: ${error.message}`);
      }
    }
    
    console.log(`Found ${tokens.length} tokens with non-zero balance`);
    
    // Display token information
    tokens.forEach((token, index) => {
      console.log(`\n${index + 1}. Token Mint: ${token.mint}`);
      console.log(`   Amount: ${token.amount}`);
      console.log(`   Decimals: ${token.decimals}`);
    });
    
  } catch (error) {
    console.error('Error fetching token accounts:', error);
  }
}

// Get wallet address from command line arguments
const walletAddress = process.argv[2];

if (!walletAddress) {
  console.error('Please provide a wallet address as a command line argument');
  console.log('Usage: node test-token-fetch.js <wallet-address>');
  process.exit(1);
}

// Run the function
fetchTokenAccounts(walletAddress);
