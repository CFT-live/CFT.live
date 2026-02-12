import { recoverMessageAddress, type Address } from "viem";

function base64UrlDecodeUtf8(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeSignedMessage(headerValue: string): string {
  if (headerValue.startsWith("b64:")) {
    return base64UrlDecodeUtf8(headerValue.slice(4));
  }
  return headerValue;
}

type ParsedMessage = {
  uri: string;
  method: string;
  issuedAt: string;
  nonce: string;
  bodySha256: string;
};

function parseMessage(message: string): ParsedMessage {
  const lines = message.split("\n").map((l) => l.trim());
  const get = (prefix: string) => {
    const line = lines.find((l) => l.startsWith(prefix));
    return line ? line.slice(prefix.length).trim() : null;
  };

  const uri = get("URI:");
  const method = get("Method:");
  const issuedAt = get("Issued At:");
  const nonce = get("Nonce:");
  const bodySha256 = get("Body SHA-256:");

  if (!uri || !method || !issuedAt || !nonce || !bodySha256) {
    throw new Error("Invalid signature message format");
  }

  return { uri, method, issuedAt, nonce, bodySha256 };
}

async function sha256Hex(data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function requireSignedRequest(input: {
  request: Request;
  rawBodyText: string;
  maxSkewMs?: number;
}): Promise<{ address: Address; message: string; signature: `0x${string}` }> {
  const { request, rawBodyText } = input;

  const messageHeader = request.headers.get("x-cft-message");
  const signature = request.headers.get("x-cft-signature") as `0x${string}` | null;
  if (!messageHeader || !signature) {
    throw new Error("Missing wallet signature headers");
  }

  const message = decodeSignedMessage(messageHeader);

  const parsed = parseMessage(message);

  const reqUrl = new URL(request.url);
  if (parsed.uri !== reqUrl.pathname) {
    throw new Error("Signature URI mismatch");
  }
  if (parsed.method.toUpperCase() !== request.method.toUpperCase()) {
    throw new Error("Signature method mismatch");
  }

  const issuedAtMs = Date.parse(parsed.issuedAt);
  if (!Number.isFinite(issuedAtMs)) {
    throw new Error("Invalid Issued At timestamp");
  }
  const maxSkewMs = input.maxSkewMs ?? 5 * 60 * 1000;
  const now = Date.now();
  if (Math.abs(now - issuedAtMs) > maxSkewMs) {
    throw new Error("Signature expired");
  }

  const computedBodyHash = await sha256Hex(
    new TextEncoder().encode(rawBodyText || "")
  );
  if (computedBodyHash !== parsed.bodySha256) {
    throw new Error("Signature body hash mismatch");
  }

  const address = await recoverMessageAddress({
    message,
    signature,
  });

  return { address, message, signature };
}
