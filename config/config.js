/**
 * Configuration for Helius API
 *
 * This file loads the Helius API key from environment variables.
 * For local development, the key is loaded from .env file.
 * For production (e.g., Render), the key is loaded from environment variables.
 */

// Try to load environment variables
try {
  if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }
} catch (error) {
  console.warn('dotenv module not found, skipping .env file loading');
}

module.exports = {
  // First try VITE_HELIUS_API_KEY (for Render compatibility), then fallback to default
  HELIUS_API_KEY: process.env.VITE_HELIUS_API_KEY || '73da6c11-2e9e-4f12-88d2-2e345d6c4c46'
};