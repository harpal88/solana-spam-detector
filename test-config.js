/**
 * Simple test script to check if the config file is being loaded correctly
 */

console.log('Testing config loading...');

try {
  // Try to load the config from the src/api/config directory
  const apiConfigDir = require('./src/api/config/config');
  console.log('API config loaded successfully:', apiConfigDir);
} catch (error) {
  console.error('Error loading API config:', error.message);
}
