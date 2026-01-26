# Smart Contract Sandbox

## Overview

The Smart Contract Sandbox is a browser-based tool that allows users to paste Solidity smart contract code, convert it to JavaScript, and interact with it in a safe, sandboxed environment. **All execution happens client-side in the browser** - no blockchain calls or server-side code execution occurs.

## Features

### 🔒 **Fully Client-Side Execution**
- All Solidity parsing and JavaScript generation happens in your browser
- No server-side code execution for security
- No actual blockchain calls or network interactions
- Your code never leaves your browser

### 📝 **Solidity to JavaScript Conversion**
- Paste any Solidity smart contract code
- Automatically parses and converts to executable JavaScript
- Preserves contract structure, functions, and state
- Supports:
  - State variables (uint256, bool, address, string, mappings, arrays)
  - Public/external functions with parameters
  - View/pure functions
  - Events emission
  - require() statements (converted to error throws)
  - Function bodies with actual implementation

### 🎯 **Interactive Contract Testing**
- Call any public/external function with custom parameters
- Contract maintains internal state across calls
- Real-time state viewer showing all state variables
- Full call history with parameters, results, and errors
- Automatic type conversion for parameters (uint256 → BigInt, etc.)

### 📊 **Visibility Features**
1. **Contract State Panel**: Shows current values of all state variables
2. **Functions Panel**: Lists all callable functions with parameter inputs
3. **Call History**: Chronological log of all function calls, including:
   - Function name
   - Parameters used
   - Return values
   - Errors (if any)
   - Timestamp

## How to Use

### Step 1: Paste Solidity Code
1. Navigate to `/sandbox` route
2. Paste your Solidity contract code in the text area
3. Example contract is provided by default (SimpleCounter)

### Step 2: Convert Contract
1. Click "Convert & Load Contract" button
2. The tool will:
   - Parse the Solidity AST
   - Extract contract structure (state variables, functions, events)
   - Generate executable JavaScript class
   - Instantiate the contract

### Step 3: Interact with Contract
1. **View State**: See all state variables and their current values
2. **Call Functions**: 
   - Select a function from the list
   - Enter parameters (if required)
   - Click "Call" button
3. **Monitor Results**:
   - See return values in call history
   - Watch state variables update in real-time
   - Check for errors in call history

### Step 4: Reset (Optional)
- Click "Load New Contract" to start over with a different contract

## Example Contracts

### Simple Counter
```solidity
contract SimpleCounter {
    uint256 private count;

    function increment() public returns (uint256) {
        count++;
        return count;
    }

    function getCount() public view returns (uint256) {
        return count;
    }
}
```

**Try it:**
1. Convert the contract
2. Call `increment()` multiple times
3. Watch `count` increase in state panel
4. Call `getCount()` to verify value

### Token Contract (More Complex)
```solidity
contract SimpleToken {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;

    function mint(address to, uint256 amount) public {
        balances[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}
```

## Technical Details

### Architecture
```
┌─────────────────┐
│  User Browser   │
├─────────────────┤
│ Solidity Code   │
│       ↓         │
│   Parser        │ ← @solidity-parser/parser
│       ↓         │
│  JS Generator   │ ← BrowserJSGenerator
│       ↓         │
│ Function()      │ ← Safe code execution
│       ↓         │
│  Contract       │
│   Instance      │
└─────────────────┘
```

### Components
1. **SolidityParser** (`lib/parser.ts`)
   - Parses Solidity source code using `@solidity-parser/parser`
   - Extracts contract metadata (state vars, functions, events, structs, enums)
   - Converts function bodies to JavaScript

2. **BrowserJSGenerator** (`lib/generator.ts`)
   - Generates executable JavaScript class from parsed contract
   - Creates getters/setters for state variables
   - Implements event tracking system
   - Provides state snapshot method

3. **React UI** (`page.tsx`)
   - Client-side React component (use client directive)
   - Manages contract instance state
   - Handles function calls and parameter conversion
   - Displays state and history

### Type Conversions

| Solidity Type | JavaScript Type | Example Input |
|--------------|----------------|---------------|
| `uint256` | `BigInt` | `1000` → `1000n` |
| `int256` | `BigInt` | `-500` → `-500n` |
| `address` | `string` | `"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"` |
| `bool` | `boolean` | `"true"` → `true` |
| `string` | `string` | `"Hello"` |
| `bytes32` | `string` | `"0x123..."` |
| `mapping` | `Map` | `new Map()` |
| `array[]` | `Array` | `[]` |

### Limitations

1. **No Real Blockchain Interaction**
   - No gas costs calculated
   - No transaction mining
   - No wallet integration
   - `msg.sender`, `msg.value`, `block.timestamp` are mocked

2. **Simplified Implementation**
   - Complex loops not fully supported
   - External contract calls not supported
   - Assembly blocks not supported
   - Some edge cases may not work perfectly

3. **Performance**
   - Large contracts may be slow to parse
   - No optimization for gas efficiency
   - Memory limitations of browser JavaScript

## Security

### Why Client-Side Only?

Running user-provided code on servers is a major security risk. This sandbox ensures:
- ✅ No arbitrary code execution on servers
- ✅ No access to server resources
- ✅ No risk to other users
- ✅ User's code remains private (never uploaded)
- ✅ No blockchain transactions or real funds at risk

### Safe Code Execution

Instead of `eval()`, the sandbox uses `Function()` constructor which:
- Creates code in separate scope
- Prevents access to global variables
- Sandboxes execution environment
- Still allows proper JavaScript execution

## Use Cases

1. **Learning Solidity**: Test contract logic without deploying
2. **Rapid Prototyping**: Quickly iterate on contract design
3. **Testing Edge Cases**: Try different input combinations
4. **Debugging**: Isolate logic issues before deploying
5. **Education**: Teach Solidity concepts interactively
6. **Documentation**: Create interactive contract examples

## Future Enhancements

Potential improvements:
- [ ] Support for multiple contracts and inheritance
- [ ] Gas estimation simulation
- [ ] Time-travel debugging (rewind state)
- [ ] Contract visualization (call graphs)
- [ ] Export test cases from interactions
- [ ] Import from verified contracts (Etherscan API)
- [ ] Advanced type support (structs as function params)
- [ ] Loop statement conversion
- [ ] Assembly block basic support

## Files Structure

```
client/app/[locale]/sandbox/
├── page.tsx              # Main UI component
├── lib/
│   ├── types.ts         # TypeScript interfaces
│   ├── parser.ts        # Solidity parser
│   └── generator.ts     # JavaScript generator
└── README.md            # This file
```

## Contributing

When contributing to the sandbox:
1. Maintain client-side only execution
2. Add tests for new Solidity features
3. Update type definitions
4. Document limitations clearly
5. Ensure security best practices

## License

Part of CFT.live platform - see main project license.
