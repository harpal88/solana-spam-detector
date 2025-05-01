/**
 * Simple test script to check if the config file is being loaded correctly
 */

console.log('Testing config loading...');

try {
  // Try to load the config from the root directory
  const rootConfig = require('./config');
  console.log('Root config loaded successfully:', rootConfig);
} catch (error) {
  console.error('Error loading root config:', error.message);
}

try {
  // Try to load the config from the src/api directory
  const apiConfig = require('./src/api/config');
  console.log('API config loaded successfully:', apiConfig);
} catch (error) {
  console.error('Error loading API config:', error.message);
}

try {
  // Try to load the config from the src/api/config directory
  const apiConfigDir = require('./src/api/config/index');
  console.log('API config directory loaded successfully:', apiConfigDir);
} catch (error) {
  console.error('Error loading API config directory:', error.message);
}
