"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletAddressProps {
  address: string;
  className?: string;
  showCopy?: boolean;
  truncate?: boolean;
}

export function WalletAddress({
  address,
  className,
  showCopy = true,
  truncate = true,
}: WalletAddressProps) {
  const [copied, setCopied] = useState(false);

  const displayAddress = truncate
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs group",
        className
      )}
    >
      <span className="text-muted-foreground">{displayAddress}</span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="opacity-50 hover:opacity-100 transition-opacity focus:outline-none focus:ring-1 focus:ring-primary rounded p-0.5"
          title="Copy address"
        >
          {copied ? (
            <Check className="w-3 h-3 text-primary" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      )}
    </span>
  );
}
