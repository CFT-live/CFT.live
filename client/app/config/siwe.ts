"use client";

import {
  createSIWEConfig,
  formatMessage,
} from "@reown/appkit-siwe";
import { networks } from "./index";

type SessionResponse = {
  address: string;
  chainId: number;
} | null;

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function getLocationContext() {
  return {
    domain: globalThis.location.host,
    uri: globalThis.location.origin,
  };
}

export const siweConfig = createSIWEConfig({
  enabled: true,
  signOutOnAccountChange: true,
  signOutOnDisconnect: true,
  signOutOnNetworkChange: true,
  getMessageParams: async () => {
    const locationContext = getLocationContext();
    return {
      chains: networks.map((network) => network.id),
      domain: locationContext.domain,
      statement: "Sign in to CFT.live.",
      uri: locationContext.uri,
    };
  },
  createMessage: ({
    address,
    chainId,
    ...args
  }) => {
    const issuer = address.startsWith("did:pkh:")
      ? address
      : `did:pkh:eip155:${chainId}:${address}`;

    return formatMessage(args, issuer);
  },
  getNonce: async () => {
    const response = await fetchJson<{ nonce: string }>("/api/auth/siwe/nonce");
    return response.nonce;
  },
  getSession: async () => fetchJson<SessionResponse>("/api/auth/siwe/session"),
  verifyMessage: async ({ message, signature }) => {
    try {
      await fetchJson<{ ok: boolean }>("/api/auth/siwe/verify", {
        body: JSON.stringify({ message, signature }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      return true;
    } catch {
      return false;
    }
  },
  signOut: async () => {
    try {
      await fetchJson<{ ok: boolean }>("/api/auth/siwe/signout", {
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      return true;
    } catch {
      return false;
    }
  },
});