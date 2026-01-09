"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type PendingConfirmation = {
  id: string;
  message?: string;
  createdAt: number;
};

type WalletConfirmationContextValue = {
  beginWalletConfirmation: (message?: string) => string;
  endWalletConfirmation: (id: string) => void;
  isAwaitingWalletConfirmation: boolean;
  message?: string;
};

const WalletConfirmationContext =
  createContext<WalletConfirmationContextValue | null>(null);

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function WalletConfirmationToast({
  message,
}: Readonly<{ message?: string }>) {
  return (
    <output
      className="fixed bottom-3 left-3 z-1000 px-4 py-2 rounded border border-primary/40 bg-background/95 backdrop-blur-md shadow-[0_8px_40px_-14px_rgba(0,0,0,0.7)]"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-primary rounded-sm animate-pulse shadow-[0_0_10px_hsl(var(--primary)/0.7)]" />
        <div className="text-xs md:text-sm font-mono uppercase tracking-wider text-foreground">
          {message ?? "Confirm the transaction in your wallet…"}
        </div>
      </div>
    </output>
  );
}

export function WalletConfirmationProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [pending, setPending] = useState<PendingConfirmation[]>([]);

  const beginWalletConfirmation = useCallback((message?: string) => {
    const id = makeId();
    setPending((prev) => [
      ...prev,
      {
        id,
        message,
        createdAt: Date.now(),
      },
    ]);
    return id;
  }, []);

  const endWalletConfirmation = useCallback((id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const isAwaitingWalletConfirmation = pending.length > 0;
  const message = pending.at(-1)?.message;

  const value = useMemo<WalletConfirmationContextValue>(
    () => ({
      beginWalletConfirmation,
      endWalletConfirmation,
      isAwaitingWalletConfirmation,
      message,
    }),
    [
      beginWalletConfirmation,
      endWalletConfirmation,
      isAwaitingWalletConfirmation,
      message,
    ]
  );

  return (
    <WalletConfirmationContext.Provider value={value}>
      {children}
      {isAwaitingWalletConfirmation ? (
        <WalletConfirmationToast message={message} />
      ) : null}
    </WalletConfirmationContext.Provider>
  );
}

export function useWalletConfirmation() {
  const ctx = useContext(WalletConfirmationContext);
  if (!ctx) {
    throw new Error(
      "useWalletConfirmation must be used within WalletConfirmationProvider"
    );
  }
  return ctx;
}
