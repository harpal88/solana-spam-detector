/**
 * Configuration for the Solana Spam Detector API
 *
 * This file loads environment variables for use throughout the application.
 * For local development, variables are loaded from .env file.
 * For production (e.g., Render), variables are loaded from the environment.
 */

// Load environment variables from .env file in development
try {
  if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }
} catch (error) {
  console.warn('dotenv module not found, skipping .env file loading');
}

// Configuration object
const config = {
  // Helius API key - required for Solana blockchain data access
  // First try VITE_HELIUS_API_KEY (for Render compatibility), then fallback to default
  HELIUS_API_KEY: process.env.VITE_HELIUS_API_KEY || '73da6c11-2e9e-4f12-88d2-2e345d6c4c46',

  // Server port
  PORT: process.env.PORT || 3000,

  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Base URL for the API (used in Swagger docs)
  // For Render, use the RENDER_EXTERNAL_URL environment variable
  BASE_URL: process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL || 'http://localhost:3000'
};

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}

// Export for ES modules
export default config;
export const HELIUS_API_KEY = config.HELIUS_API_KEY;
export const PORT = config.PORT;
export const NODE_ENV = config.NODE_ENV;
export const BASE_URL = config.BASE_URL;
