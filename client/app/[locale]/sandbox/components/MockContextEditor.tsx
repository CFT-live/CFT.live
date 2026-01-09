'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { MockContext } from '../lib/generator';

interface MockContextEditorProps {
  mockContext: MockContext;
  onApply: (newContext: MockContext) => void;
}

export function MockContextEditor({ mockContext, onApply }: MockContextEditorProps) {
  const [editedContext, setEditedContext] = useState(mockContext);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          Configure mock blockchain environment variables
        </p>
        <Button
          onClick={() => onApply(editedContext)}
          size="sm"
        >
          Apply & Reload
        </Button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium block mb-1.5">msg.sender</label>
          <input
            type="text"
            value={editedContext.msgSender}
            onChange={(e) => setEditedContext({ ...editedContext, msgSender: e.target.value })}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="0x0000000000000000000000000000000000000001"
          />
          <p className="text-xs text-muted-foreground mt-1">Address calling the contract</p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">msg.value</label>
          <input
            type="text"
            value={editedContext.msgValue}
            onChange={(e) => setEditedContext({ ...editedContext, msgValue: e.target.value })}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground mt-1">Wei sent with transaction</p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">block.timestamp</label>
          <input
            type="text"
            value={editedContext.blockTimestamp}
            onChange={(e) => setEditedContext({ ...editedContext, blockTimestamp: e.target.value })}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={Math.floor(Date.now() / 1000).toString()}
          />
          <p className="text-xs text-muted-foreground mt-1">Unix timestamp in seconds</p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">block.number</label>
          <input
            type="text"
            value={editedContext.blockNumber}
            onChange={(e) => setEditedContext({ ...editedContext, blockNumber: e.target.value })}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="1"
          />
          <p className="text-xs text-muted-foreground mt-1">Current block number</p>
        </div>
      </div>
    </div>
  );
}
