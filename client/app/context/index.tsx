"use client";

import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { arbitrum } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { projectId, wagmiAdapter } from "../config";
import { siweConfig } from "../config/siwe";

const queryClient = new QueryClient();

if (!projectId) {
  throw new Error("Project ID is not defined");
}

// Set up metadata
const metadata = {
  name: "CFT.live",
  description: "CFT.live",
  url: "https://www.cft.live",
  icons: ["https://www.cft.live/images/icon-192.png"],
};

// Create the modal
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [arbitrum],
  defaultNetwork: arbitrum,
  metadata: metadata,
  siweConfig,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
  themeMode: "dark",
});

export function ContextProvider({
  children,
  cookies,
}: Readonly<{ children: ReactNode; cookies: string | null }>) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig, cookies);
  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
