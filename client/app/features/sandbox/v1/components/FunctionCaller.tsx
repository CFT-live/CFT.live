'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FunctionDefinition } from '../lib/types';

interface FunctionCallerProps {
  func: FunctionDefinition;
  onCall: (func: FunctionDefinition, params: unknown[]) => void;
  isExecuting?: boolean;
}

export function FunctionCaller({ func, onCall, isExecuting }: FunctionCallerProps) {
  const [params, setParams] = useState<string[]>(func.parameters.map(() => ''));

  const handleCall = () => {
    onCall(func, params);
  };

  const isView = func.stateMutability === 'view' || func.stateMutability === 'pure';

  return (
    <div className="border rounded-md p-3 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold">{func.name}</span>
        {isView && (
          <Badge variant="outline" className="text-xs">
            view
          </Badge>
        )}
      </div>

      {func.parameters.length > 0 && (
        <div className="space-y-2">
          {func.parameters.map((param, idx) => (
            <div key={idx}>
              <label className="text-xs text-muted-foreground font-mono">
                {param.name} ({param.type})
              </label>
              <input
                type="text"
                value={params[idx]}
                onChange={(e) => {
                  const newParams = [...params];
                  newParams[idx] = e.target.value;
                  setParams(newParams);
                }}
                className="w-full px-2 py-1.5 text-sm border rounded-md bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={`Enter ${param.type}`}
              />
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={handleCall}
        disabled={isExecuting}
        className="w-full"
        size="sm"
      >
        {isExecuting ? 'Executing...' : 'Call'}
      </Button>
    </div>
  );
}
