

'use client';

import { useState, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardTemplate } from '@/app/components/CardTemplate';
import { Instructions } from '@/app/components/Instructions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SolidityParser } from './lib/parser';
import { BrowserJSGenerator, type MockContext } from './lib/generator';
import type { ParsedContract, FunctionDefinition } from './lib/types';
import { FunctionCaller } from './components/FunctionCaller';
import { MockContextEditor } from './components/MockContextEditor';

interface ContractInstance {
  contract: ParsedContract;
  instance: Record<string, unknown>;
  callHistory: CallRecord[];
  generatedCode: string;
  mockContext: MockContext;
}

interface CallRecord {
  id: number;
  functionName: string;
  params: unknown[];
  result: unknown;
  error?: string;
  timestamp: number;
}

export default function SandboxPage() {
  const [solidityCode, setSolidityCode] = useState<string>(EXAMPLE_CONTRACT);
  const [contractInstance, setContractInstance] = useState<ContractInstance | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const callIdCounter = useRef(0);

  // Helper to safely stringify values with BigInt support
  const safeStringify = (value: unknown): string => {
    return JSON.stringify(value, (_key, val) => 
      typeof val === 'bigint' ? val.toString() + 'n' : val
    );
  };

  const convertContract = useCallback(async () => {
    if (!solidityCode.trim()) {
      setError('Please enter Solidity code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Parse Solidity code
      const parser = new SolidityParser();
      const contracts = parser.parse(solidityCode);

      if (contracts.length === 0) {
        throw new Error('No contracts found in the code');
      }

      const contract = contracts[0];

      // Default mock context values
      const mockContext: MockContext = {
        msgSender: '0x0000000000000000000000000000000000000001',
        msgValue: '0',
        blockTimestamp: Math.floor(Date.now() / 1000).toString(),
        blockNumber: '1',
      };

      // Generate JavaScript code
      const generator = new BrowserJSGenerator();
      const jsCode = generator.generate(contract, mockContext);

      // Create instance using Function constructor (safer than eval)
      console.log('🚀 Creating contract instance...');
      console.log('📝 Full generated code:\n', jsCode);
      

      try {
        const ContractClass = new Function(jsCode)();
        const instance = new ContractClass();
        console.log('✅ Contract instance created successfully');
        
        setContractInstance({
          contract,
          instance,
          callHistory: [],
          generatedCode: jsCode,
          mockContext,
        });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (execError: any) {
        console.error('❌ Failed to execute generated code:', execError);
        console.error('Error message:', execError.message);
        console.error('Error stack:', execError.stack);
        
        // Try to extract line number from error message
        const lineMatch = execError.message?.match(/line (\d+)/i) || execError.stack?.match(/<anonymous>:(\d+)/);
        if (lineMatch) {
          const lineNum = parseInt(lineMatch[1]) - 1; // 0-indexed
          const lines = jsCode.split('\n');
          console.error(`\n🔍 Error near line ${lineNum + 1}:`);
          console.error('Previous 5 lines:', lines.slice(Math.max(0, lineNum - 5), lineNum).join('\n'));
          console.error('>>> ERROR LINE >>>', lines[lineNum]);
          console.error('Next 5 lines:', lines.slice(lineNum + 1, lineNum + 6).join('\n'));
        }
        
        throw new Error(`Generated JavaScript has syntax error: ${execError.message}\n\nCheck console for full generated code and error details.`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to convert contract');
    } finally {
      setLoading(false);
    }
  }, [solidityCode]);

  const reloadFromCode = useCallback((editedCode: string, newMockContext?: MockContext) => {
    if (!contractInstance) return;

    setLoading(true);
    setError('');

    try {
      // Create instance from edited JavaScript code
      // This runs entirely in the browser - no server-side execution
      const ContractClass = new Function(editedCode)();
      const instance = new ContractClass();

      setContractInstance({
        ...contractInstance,
        instance,
        callHistory: [], // Reset history when reloading
        generatedCode: editedCode,
        mockContext: newMockContext || contractInstance.mockContext,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reload contract from edited code');
    } finally {
      setLoading(false);
    }
  }, [contractInstance]);

  const callFunction = useCallback(
    (func: FunctionDefinition, params: unknown[]) => {
      if (!contractInstance) return;

      try {
        // Convert string inputs to appropriate types
        const convertedParams = params.map((param, idx) => {
          const paramType = func.parameters[idx]?.type;
          if (!paramType) return param;

          if (paramType.startsWith('uint') || paramType.startsWith('int')) {
            return BigInt((param as string) || '0');
          }
          if (paramType === 'bool') {
            return param === 'true' || param === true;
          }
          return param;
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (contractInstance.instance as any)[func.name](...convertedParams);

        const callRecord: CallRecord = {
          id: ++callIdCounter.current,
          functionName: func.name,
          params: convertedParams,
          result: result !== undefined ? String(result) : 'void',
          timestamp: Date.now(),
        };

        setContractInstance({
          ...contractInstance,
          callHistory: [...contractInstance.callHistory, callRecord],
        });
      } catch (err: unknown) {
        const callRecord: CallRecord = {
          id: ++callIdCounter.current,
          functionName: func.name,
          params,
          result: null,
          error: err instanceof Error ? err.message : String(err),
          timestamp: Date.now(),
        };

        setContractInstance({
          ...contractInstance,
          callHistory: [...contractInstance.callHistory, callRecord],
        });
      }
    },
    [contractInstance]
  );

  const resetContract = useCallback(() => {
    setContractInstance(null);
    setSolidityCode('');
    setError('');
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8 border-b border-border pb-6 sm:pb-8">
        <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-3 uppercase tracking-wider">
          Contract_Sandbox
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Convert Solidity contracts to JavaScript and test them in a safe browser environment. All execution happens locally - no blockchain calls are made.
        </p>
      </div>

      {/* Instructions */}
      <Instructions
        title="CONTRACT_SANDBOX_MANUAL.TXT"
        instructions={[
          'Paste your Solidity contract code into the editor',
          'Click "Convert & Load Contract" to parse and generate JavaScript',
          'Interact with contract functions using the generated interface',
          'View and edit generated JavaScript code in real-time',
          'Configure mock blockchain context (msg.sender, block.timestamp, etc.)',
          'All execution runs in your browser - perfect for testing contract logic'
        ]}
        toggleOpenLabel="READ_MANUAL"
        toggleCloseLabel="CLOSE_MANUAL"
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!contractInstance ? (
        <CardTemplate
          title="Input Contract"
          description="Paste Solidity source code"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Solidity Contract Code</label>
              <textarea
                value={solidityCode}
                onChange={(e) => setSolidityCode(e.target.value)}
                className="w-full h-96 p-4 font-mono text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                placeholder={PLACE_HOLDER}
                spellCheck={false}
              />
            </div>
            <Button
              onClick={convertContract}
              disabled={loading}
              size="lg"
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                'Convert & Load Contract'
              )}
            </Button>
          </div>
        </CardTemplate>
      ) : (
        <ContractInterface
          contractInstance={contractInstance}
          onCallFunction={callFunction}
          onReset={resetContract}
          onReloadFromCode={reloadFromCode}
          safeStringify={safeStringify}
        />
      )}
    </div>
  );
}

interface ContractInterfaceProps {
  contractInstance: ContractInstance;
  onCallFunction: (func: FunctionDefinition, params: unknown[]) => void;
  onReset: () => void;
  onReloadFromCode: (code: string, mockContext?: MockContext) => void;
  safeStringify: (value: unknown) => string;
}

function ContractInterface({ contractInstance, onCallFunction, onReset, onReloadFromCode, safeStringify }: ContractInterfaceProps) {
  const { contract, instance, callHistory, generatedCode, mockContext } = contractInstance;
  const [showGeneratedCode, setShowGeneratedCode] = useState(false);
  const [editedCode, setEditedCode] = useState(generatedCode);
  const [isEditing, setIsEditing] = useState(false);
  const [showMockContext, setShowMockContext] = useState(false);
  const [executingFunction, setExecutingFunction] = useState<string | null>(null);

  // Update editedCode when generatedCode changes (on reload)
  useState(() => {
    setEditedCode(generatedCode);
  });

  const handleMockContextApply = (newContext: MockContext) => {
    const generator = new BrowserJSGenerator();
    const newCode = generator.generate(contract, newContext);
    setEditedCode(newCode);
    onReloadFromCode(newCode, newContext);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold font-mono uppercase tracking-wider">{contract.name}</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowMockContext(!showMockContext)}
              variant={showMockContext ? 'default' : 'outline'}
              size="sm"
            >
              Mock Context
            </Button>
            <Button
              onClick={() => setShowGeneratedCode(!showGeneratedCode)}
              variant={showGeneratedCode ? 'default' : 'outline'}
              size="sm"
            >
              {showGeneratedCode ? 'Hide' : 'View'} Code
            </Button>
            <Button
              onClick={onReset}
              variant="outline"
              size="sm"
            >
              Load New
            </Button>
          </div>
        </div>

        {showMockContext && (
          <CardTemplate
            title="Mock Context"
            description="Blockchain environment variables"
          >
            <MockContextEditor
              mockContext={mockContext}
              onApply={handleMockContextApply}
            />
          </CardTemplate>
        )}

        {showGeneratedCode && (
          <CardTemplate
            title="Generated JavaScript"
            description="Browser-executable contract code"
          >
            <div className="space-y-3">
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                  >
                    Edit Code
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        onReloadFromCode(editedCode);
                        setIsEditing(false);
                      }}
                      size="sm"
                    >
                      Apply Changes
                    </Button>
                    <Button
                      onClick={() => {
                        setEditedCode(generatedCode);
                        setIsEditing(false);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
              {isEditing ? (
                <textarea
                  value={editedCode}
                  onChange={(e) => setEditedCode(e.target.value)}
                  className="w-full h-96 text-xs font-mono p-3 bg-background rounded-md border focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  spellCheck={false}
                />
              ) : (
                <pre className="text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto p-3 bg-background rounded-md border">
                  {generatedCode}
                </pre>
              )}
            </div>
          </CardTemplate>
        )}

        {/* Contract State */}
        <CardTemplate
          title="Contract State"
          description="Current state variable values"
        >
          <div className="space-y-2">
            {contract.stateVariables.map((stateVar) => (
              <div key={stateVar.name} className="flex justify-between items-center p-2 bg-accent/50 rounded-md">
                <span className="font-mono text-sm">{stateVar.name}</span>
                <span className="font-mono text-sm text-muted-foreground break-all text-right ml-4">
                  {String(instance[`_${stateVar.name}`] ?? 'undefined')}
                </span>
              </div>
            ))}
            {contract.stateVariables.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No state variables</p>
            )}
          </div>
        </CardTemplate>

        {/* Functions */}
        <CardTemplate
          title="Functions"
          description="Call contract functions"
        >
          <div className="space-y-3">
            {contract.functions
              .filter((f) => f.visibility === 'public' || f.visibility === 'external')
              .map((func) => (
                <FunctionCaller 
                  key={func.name} 
                  func={func} 
                  onCall={(f, params) => {
                    setExecutingFunction(f.name);
                    onCallFunction(f, params);
                    setExecutingFunction(null);
                  }}
                  isExecuting={executingFunction === func.name}
                />
              ))}
            {contract.functions.filter((f) => f.visibility === 'public' || f.visibility === 'external').length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No public functions</p>
            )}
          </div>
        </CardTemplate>
      </div>

      <div>
        {/* Call History */}
        <CardTemplate
          title="Call History"
          description="Function execution log"
        >
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {callHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No function calls yet</p>
            ) : (
              [...callHistory].reverse().map((call) => (
                <div
                  key={call.id}
                  className={`p-3 rounded-md border ${
                    call.error ? 'bg-destructive/10 border-destructive' : 'bg-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-semibold">{call.functionName}()</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(call.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {call.params.length > 0 && (
                    <div className="text-xs font-mono mb-1 break-all">
                      Params: {safeStringify(call.params)}
                    </div>
                  )}
                  {call.error ? (
                    <div className="text-xs text-destructive break-all">Error: {call.error}</div>
                  ) : (
                    <div className="text-xs font-mono break-all">Result: {String(call.result)}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardTemplate>
      </div>
    </div>
  );
}

const EXAMPLE_CONTRACT = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    uint256 private value;

    // Emitted whenever the value changes
    event ValueChanged(uint256 newValue, address indexed changedBy);

    // Set a new value
    function setValue(uint256 newValue) external {
        value = newValue;
        emit ValueChanged(newValue, msg.sender);
    }

    // Read the stored value
    function getValue() external view returns (uint256) {
        return value;
    }
}
`

const PLACE_HOLDER = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyContract {
// Your contract code here...;
}
`