/**
 * API Helper Functions for Solana Dusting Attack Detector
 *
 * This module provides helper functions for making API requests to Helius,
 * Solana public RPC, and Solana Explorer API.
 */

// Try to load config file, use placeholder if not found
let HELIUS_API_KEY = '';
try {
  const config = require('../../config/config');
  HELIUS_API_KEY = config.HELIUS_API_KEY;
} catch (error) {
  console.error('Config file not found or invalid. Please create a config.js file based on config.example.js');
  console.error('Exiting...');
  process.exit(1);
}

const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_API_URL = `https://api.helius.xyz/v0`;
const SOLANA_PUBLIC_RPC = 'https://api.mainnet-beta.solana.com';
const SOLANA_EXPLORER_API = 'https://explorer-api.mainnet-beta.solana.com';

/**
 * Helper function to make JSON-RPC requests to Helius
 * @param {string} method - The RPC method to call
 * @param {Array} params - The parameters for the RPC method
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns {Promise<Object>} - The response from the RPC call
 */
async function makeRpcRequest(method, params = [], timeoutMs = 10000) {
  try {
    // Create an abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      signal: controller.signal
    });

    // Clear the timeout
    clearTimeout(timeoutId);

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`RPC request to ${method} timed out after ${timeoutMs}ms`);
    } else {
      console.error(`Error making RPC request to ${method}:`, error);
    }
    return null;
  }
}

/**
 * Helper function to make JSON-RPC requests to public Solana RPC
 * @param {string} method - The RPC method to call
 * @param {Array} params - The parameters for the RPC method
 * @returns {Promise<Object>} - The response from the RPC call
 */
async function makePublicRpcRequest(method, params = []) {
  try {
    const response = await fetch(SOLANA_PUBLIC_RPC, {
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
    console.error(`Error making public RPC request to ${method}:`, error);
    return null;
  }
}

/**
 * Helper function to make API requests to Helius
 * @param {string} endpoint - The API endpoint to call
 * @param {string} method - The HTTP method to use
 * @param {Object} body - The request body
 * @returns {Promise<Object>} - The response from the API call
 */
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

/**
 * Helper function to make requests to Solana Explorer API
 * @param {string} endpoint - The API endpoint to call
 * @param {Object} params - The query parameters
 * @returns {Promise<Object>} - The response from the API call
 */
async function makeExplorerRequest(endpoint, params = {}) {
  try {
    // Convert params to query string
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      queryParams.append(key, value);
    }

    const url = `${SOLANA_EXPLORER_API}${endpoint}?${queryParams.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making Explorer API request to ${endpoint}:`, error);
    return null;
  }
}

/**
 * Get transaction signatures for an address
 * @param {string} address - The wallet address to get signatures for
 * @param {number} limit - The maximum number of signatures to return
 * @returns {Promise<Array<string>>} - Array of transaction signatures
 */
async function getTransactionSignatures(address, limit = 10) {
  try {
    const response = await makeRpcRequest('getSignaturesForAddress', [
      address,
      { limit }
    ]);

    if (response && response.result) {
      return response.result.map(item => item.signature);
    }

    return [];
  } catch (error) {
    console.error('Error fetching transaction signatures:', error);
    return [];
  }
}

module.exports = {
  HELIUS_API_KEY,
  HELIUS_RPC_URL,
  HELIUS_API_URL,
  SOLANA_PUBLIC_RPC,
  SOLANA_EXPLORER_API,
  makeRpcRequest,
  makePublicRpcRequest,
  makeApiRequest,
  makeExplorerRequest,
  getTransactionSignatures
};
