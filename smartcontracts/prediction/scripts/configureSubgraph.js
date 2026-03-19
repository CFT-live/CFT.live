import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
function loadEnv() {
  const envPath = join(__dirname, '../../../', '.env');
  
  if (!existsSync(envPath)) {
    console.error('❌ Error: .env file not found. Run "npm run setup" first.');
    process.exit(1);
  }

  const envContent = readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      const cleanValue = value.trim();
      envVars[key.trim()] = cleanValue.startsWith('"') || cleanValue.startsWith("'") 
        ? cleanValue.slice(1, -1) 
        : cleanValue;
    }
  });

  return envVars;
}

// Validate required environment variables
function validateEnv(env) {
  const required = ['NEXT_PUBLIC_PREDICTION_MARKET_CONTRACT_ADDRESS', 'PREDICTION_MARKET_START_BLOCK', 'NETWORK'];
  const missing = required.filter(key => !env[key] || env[key] === '0x0000000000000000000000000000000000000000' || env[key] === '0');
  
  if (missing.length > 0) {
    console.error(`❌ Error: Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please update your .env file with the correct values.');
    process.exit(1);
  }
}

// Update subgraph.yaml with environment variables
function updateSubgraphConfig(env) {
  const subgraphPath = join(__dirname, '..', 'subgraph.yaml');
  
  if (!existsSync(subgraphPath)) {
    console.error('❌ Error: subgraph.yaml not found.');
    process.exit(1);
  }

  let content = readFileSync(subgraphPath, 'utf8');
  
  // Replace contract address
  content = content.replace(
    /address: "0x[a-fA-F0-9]{40}"/,
    `address: "${env.NEXT_PUBLIC_PREDICTION_MARKET_CONTRACT_ADDRESS}"`
  );
  
  // Replace start block
  content = content.replace(
    /startBlock: \d+/,
    `startBlock: ${env.PREDICTION_MARKET_START_BLOCK}`
  );
  
  // Replace network
  content = content.replace(
    /network: [a-zA-Z0-9-]+/,
    `network: ${env.NETWORK}`
  );
  
  writeFileSync(subgraphPath, content);
}

// Main configuration function
function configure() {
  console.log('🔧 Configuring subgraph...');
  
  try {
    const env = loadEnv();
    validateEnv(env);
    updateSubgraphConfig(env);
    
    console.log('✅ Subgraph configured successfully!');
    console.log(`📝 Contract Address: ${env.NEXT_PUBLIC_PREDICTION_MARKET_CONTRACT_ADDRESS}`);
    console.log(`📝 Start Block: ${env.PREDICTION_MARKET_START_BLOCK}`);
    console.log(`📝 Network: ${env.NETWORK}`);
    
  } catch (error) {
    console.error('❌ Configuration failed:', error.message);
    process.exit(1);
  }
}

// Run configuration if called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  configure();
}

export default { configure, loadEnv };