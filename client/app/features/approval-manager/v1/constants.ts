// Human-readable labels for known Arbitrum contract addresses (all lowercase)
export const KNOWN_SPENDERS: Record<string, string> = {
  // Uniswap
  "0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap V3 Router",
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": "Uniswap SwapRouter02",
  "0x5e325eda8064b456f4781070c0738d849c824258": "Uniswap Universal Router",
  "0x4c60051384bd2d3c01bfc845cf5f4b44bcbe9de5": "Uniswap Universal Router V2",
  // Aave
  "0x794a61358d6845594f94dc1db02a252b5b4814ad": "Aave V3 Pool",
  "0xa97684ead0e402dc232d5a977953df7ecbab3cdb": "Aave Pool Addresses Provider",
  // GMX
  "0xabbc5f99639c9b6bcb58544ddf04efa6802f4064": "GMX Router V1",
  "0x7c68c7866a64fa2160f78eeae12217ffbf871fa8": "GMX Router V2",
  "0x489ee077994b6658eafa855c308275ead8097c4a": "GMX Vault",
  // SushiSwap
  "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506": "SushiSwap Router",
  // 1inch
  "0x1111111254eeb25477b68fb85ed929f73a960582": "1inch V5 Router",
  "0x111111125421ca6dc452d289314280a0f8842a65": "1inch V6 Router",
  // Balancer
  "0xba12222222228d8ba445958a75a0704d566bf2c8": "Balancer V2 Vault",
  // Camelot
  "0xc873fecbd354f5a56e00e710b90ef4201db2448d": "Camelot Router",
  // Stargate
  "0x53bf833a5d6c4dda888f69c22c88c9f356a41614": "Stargate Router",
  // Pendle
  "0x00000000005bbb0ef59571e58418f9a4357b68a0": "Pendle Router",
  // Radiant
  "0xf4b1486dd74d07706052a33d31d7c0aafd0659e1": "Radiant Capital",
  // Curve
  "0x960ea3e3c7fb317332d990873d354e18d7645590": "Curve Router",
  // Trader Joe
  "0xb4315e873dbcf96ffd0acd8ea43f689d8c20fb30": "Trader Joe Router",
  // Arbitrum Bridge
  "0x72ce9c846789fdb6fc1f34ac4ad25dd9ef7031ef": "Arbitrum Gateway Router",
  "0x096760f208390250649e3e8763348e783aef5562": "Arbitrum Gateway Router (L2)",
};

// Fallback metadata for common Arbitrum tokens (used if on-chain calls fail)
export const KNOWN_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  "0xaf88d065e77c8cc2239327c5edb3a432268e5831": { symbol: "USDC", name: "USD Coin", decimals: 6 },
  "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8": { symbol: "USDC.e", name: "Bridged USDC", decimals: 6 },
  "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": { symbol: "USDT", name: "Tether USD", decimals: 6 },
  "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": { symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f": { symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8 },
  "0x912ce59144191c1204e64559fe8253a0e49e6548": { symbol: "ARB", name: "Arbitrum", decimals: 18 },
  "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1": { symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a": { symbol: "GMX", name: "GMX", decimals: 18 },
  "0x539bde0d7dbd336b79148aa742883198bbf60342": { symbol: "MAGIC", name: "Magic", decimals: 18 },
  "0x6694340fc020c5e6b96567843da2df01b2ce1eb6": { symbol: "STG", name: "Stargate Token", decimals: 18 },
};

// Allowances >= this threshold are treated as "unlimited" (practical MaxUint256 / 2)
export const UNLIMITED_THRESHOLD = BigInt(10) ** BigInt(36);

// Etherscan API V2 — chain-agnostic endpoint, chainid=42161 targets Arbitrum One
export const ARBISCAN_API_BASE = "https://api.etherscan.io/v2/api";
export const ARBITRUM_CHAIN_ID = "42161";

// keccak256("Approval(address,address,uint256)")
export const APPROVAL_TOPIC0 =
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

export const ARBITRUM_TOKEN_LIST_URL = "https://tokens.coingecko.com/arbitrum-one/all.json";

export const ARBISCAN_MAX_PAGES = 5;
export const ARBISCAN_PAGE_SIZE = 1000;

// CFT platform contracts — pulled from env vars (NEXT_PUBLIC_* are inlined at build time).
// These are treated as known/trusted spenders so they don't get flagged as high risk.
const CFT_SPENDER_ENV: Array<[string | undefined, string]> = [
  [process.env.NEXT_PUBLIC_PREDICTION_MARKET_CONTRACT_ADDRESS, "CFT Prediction Market"],
  [process.env.NEXT_PUBLIC_LOTTO_CONTRACT_ADDRESS, "CFT Lotto Pool"],
  [process.env.NEXT_PUBLIC_ROULETTE_CONTRACT_ADDRESS, "CFT Hash Roulette"],
  [process.env.NEXT_PUBLIC_CFT_TOKEN_CONTRACT_ADDRESS, "CFT Token"],
  [process.env.NEXT_PUBLIC_CFT_REDEMPTION_POOL_CONTRACT_ADDRESS, "CFT Redemption Pool"],
  [process.env.NEXT_PUBLIC_CONTRIBUTOR_DISTRIBUTOR_CONTRACT_ADDRESS, "CFT Contributor Distributor"],
];

export const ALL_KNOWN_SPENDERS: Record<string, string> = {
  ...KNOWN_SPENDERS,
  ...Object.fromEntries(
    CFT_SPENDER_ENV
      .filter((entry): entry is [string, string] => !!entry[0])
      .map(([addr, label]) => [addr.toLowerCase(), label]),
  ),
};

// Set of CFT contract addresses — always forced to LOW risk regardless of approval amount.
export const CFT_SPENDER_ADDRESSES: Set<string> = new Set(
  CFT_SPENDER_ENV
    .filter((entry): entry is [string, string] => !!entry[0])
    .map(([addr]) => addr.toLowerCase()),
);
