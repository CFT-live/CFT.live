import { signMessage } from "wagmi/actions";
import { config } from "@/app/config";

export type SignedHeaders = {
  "x-cft-message": string;
  "x-cft-signature": string;
};

function base64UrlEncodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const copy = Uint8Array.from(data);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildSignedHeaders(input: {
  method: string;
  pathname: string;
  bodyText: string;
}): Promise<SignedHeaders> {
  const issuedAt = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const bodyHash = await sha256Hex(new TextEncoder().encode(input.bodyText));

  const message = [
    "CFT.live Request Signature",
    `URI: ${input.pathname}`,
    `Method: ${input.method.toUpperCase()}`,
    `Issued At: ${issuedAt}`,
    `Nonce: ${nonce}`,
    `Body SHA-256: ${bodyHash}`,
  ].join("\n");

  const signature = await signMessage(config, { message });

  return {
    // Header values cannot contain raw newlines; encode the signed message.
    "x-cft-message": `b64:${base64UrlEncodeUtf8(message)}`,
    "x-cft-signature": signature,
  };
}
