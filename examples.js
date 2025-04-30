/**
 * Solana Spam Detector Examples
 * 
 * This script provides examples of using the Solana Spam Detector CLI commands
 * with the example transactions provided in data/example-transactions.json.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Load example transactions
const examplesPath = path.join(__dirname, 'data', 'example-transactions.json');
const examples = JSON.parse(fs.readFileSync(examplesPath, 'utf8'));

// Command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Available commands
const COMMANDS = {
  'tx': runTransactionExamples,
  'wallet': runWalletExamples,
  'token': runTokenExamples,
  'all': runAllExamples,
  'help': showHelp
};

// Main function
function main() {
  console.log('\n=== Solana Spam Detector Examples ===\n');
  
  if (!command || !COMMANDS[command]) {
    console.log('Please specify a valid command:');
    return showHelp();
  }
  
  COMMANDS[command]();
}

// Run transaction examples
function runTransactionExamples() {
  console.log('Running transaction examples...\n');
  
  examples.transactions.forEach((tx, index) => {
    console.log(`Example ${index + 1}: ${tx.type}`);
    console.log(`Description: ${tx.description}`);
    console.log(`Expected Result: ${tx.expectedResult}`);
    console.log(`Command: node index.js tx ${tx.signature}`);
    console.log('\nRunning command...\n');
    
    const child = spawn('node', ['index.js', 'tx', tx.signature], { stdio: 'inherit' });
    
    child.on('close', (code) => {
      console.log(`\nExample ${index + 1} completed with exit code ${code}`);
      console.log('='.repeat(50) + '\n');
      
      // Run next example after a delay
      if (index < examples.transactions.length - 1) {
        setTimeout(() => {
          examples.transactions[index + 1].run();
        }, 2000);
      }
    });
  });
}

// Run wallet examples
function runWalletExamples() {
  console.log('Running wallet examples...\n');
  
  examples.wallets.forEach((wallet, index) => {
    console.log(`Example ${index + 1}: ${wallet.address}`);
    console.log(`Description: ${wallet.description}`);
    console.log(`Expected Result: ${wallet.expectedResult}`);
    console.log(`Command: node index.js wallet ${wallet.address} 10`);
    console.log('\nRunning command...\n');
    
    const child = spawn('node', ['index.js', 'wallet', wallet.address, '10'], { stdio: 'inherit' });
    
    child.on('close', (code) => {
      console.log(`\nExample ${index + 1} completed with exit code ${code}`);
      console.log('='.repeat(50) + '\n');
    });
  });
}

// Run token examples
function runTokenExamples() {
  console.log('Running token examples...\n');
  
  examples.tokens.forEach((token, index) => {
    console.log(`Example ${index + 1}: ${token.symbol} (${token.mint})`);
    console.log(`Description: ${token.description}`);
    console.log(`Expected Result: ${token.expectedResult}`);
    console.log(`Command: node index.js token ${token.mint} 10`);
    console.log('\nRunning command...\n');
    
    const child = spawn('node', ['index.js', 'token', token.mint, '10'], { stdio: 'inherit' });
    
    child.on('close', (code) => {
      console.log(`\nExample ${index + 1} completed with exit code ${code}`);
      console.log('='.repeat(50) + '\n');
    });
  });
}

// Run all examples
function runAllExamples() {
  console.log('Running all examples...\n');
  
  // Run one example of each type
  console.log('Transaction Example:');
  const txExample = examples.transactions[0];
  console.log(`Command: node index.js tx ${txExample.signature}`);
  console.log('\nRunning command...\n');
  
  const txChild = spawn('node', ['index.js', 'tx', txExample.signature], { stdio: 'inherit' });
  
  txChild.on('close', () => {
    console.log('\nWallet Example:');
    const walletExample = examples.wallets[0];
    console.log(`Command: node index.js wallet ${walletExample.address} 10`);
    console.log('\nRunning command...\n');
    
    const walletChild = spawn('node', ['index.js', 'wallet', walletExample.address, '10'], { stdio: 'inherit' });
    
    walletChild.on('close', () => {
      console.log('\nToken Example:');
      const tokenExample = examples.tokens[0];
      console.log(`Command: node index.js token ${tokenExample.mint} 10`);
      console.log('\nRunning command...\n');
      
      const tokenChild = spawn('node', ['index.js', 'token', tokenExample.mint, '10'], { stdio: 'inherit' });
      
      tokenChild.on('close', () => {
        console.log('\nAll examples completed!');
      });
    });
  });
}

// Show help
function showHelp() {
  console.log('Usage: node examples.js <command>');
  console.log('\nAvailable commands:');
  console.log('  tx     - Run transaction examples');
  console.log('  wallet - Run wallet examples');
  console.log('  token  - Run token examples');
  console.log('  all    - Run one example of each type');
  console.log('  help   - Show this help message');
  console.log('\nExample:');
  console.log('  node examples.js tx');
}

// Run the main function
main();
