import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const artifactPath = path.join(__dirname, '../artifacts/contracts/CftToken.sol/CFTToken.json');
const outputPath = path.join(__dirname, '../../../client/app/lib/contracts/abis/CftToken.ts');

try {
  // Read the artifact JSON
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  // Extract the ABI
  const abi = artifact.abi;
  
  // Format the TypeScript file content
  const tsContent = `export const abi = ${JSON.stringify(abi, null, 2)} as const;\n`;
  
  // Ensure the output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write the TypeScript file
  fs.writeFileSync(outputPath, tsContent, 'utf8');
  
  console.log('✅ ABI successfully copied to CftToken.ts');
  console.log(`   From: ${artifactPath}`);
  console.log(`   To: ${outputPath}`);
} catch (error) {
  console.error('❌ Error copying ABI:', error.message);
  process.exit(1);
}
