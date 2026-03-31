import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artifactPath = path.join(__dirname, '../artifacts/contracts/TokenFaucet.sol/TokenFaucet.json');
const outputPath = path.join(__dirname, '../../../client/app/lib/contracts/abis/TokenFaucet.ts');

try {
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const abi = artifact.abi;
  const tsContent = `export const abi = ${JSON.stringify(abi, null, 2)} as const;\n`;

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, tsContent, 'utf8');

  console.log('✅ ABI successfully copied to TokenFaucet.ts');
  console.log(`   From: ${artifactPath}`);
  console.log(`   To: ${outputPath}`);
} catch (error) {
  console.error('❌ Error copying ABI:', error.message);
  process.exit(1);
}
