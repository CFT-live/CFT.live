export type AuthSession = {
  address: string;
  chainId: number;
};

type SignedEnvelope<T> = {
  exp: number;
  iat: number;
  value: T;
};

export const SIWE_NONCE_COOKIE = "cft_siwe_nonce";
export const SIWE_SESSION_COOKIE = "cft_siwe_session";

const NONCE_MAX_AGE_SECONDS = 10 * 60; // 10 minutes
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days
const SIWE_NONCE_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function getSessionSecret(): string {
  const secret = process.env.SIWE_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SIWE_SESSION_SECRET env var");
  }

  return secret;
}

function toBase64Url(input: Uint8Array): string {
  let binary = "";
  for (const byte of input) {
    binary += String.fromCodePoint(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(input: string): Uint8Array {
  const base64 = input.replaceAll("-", "+").replaceAll("_", "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);

  return Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0);
}

function encodeUtf8(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function decodeUtf8(input: Uint8Array): string {
  return new TextDecoder().decode(input);
}

async function createHmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encodeUtf8(getSessionSecret()),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encodeUtf8(payload));
  return toBase64Url(new Uint8Array(signature));
}

async function encodeSignedValue<T>(value: T, maxAgeSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const envelope: SignedEnvelope<T> = {
    exp: now + maxAgeSeconds,
    iat: now,
    value,
  };

  const payload = toBase64Url(encodeUtf8(JSON.stringify(envelope)));
  const signature = await createHmac(payload);

  return `${payload}.${signature}`;
}

async function decodeSignedValue<T>(token: string | undefined): Promise<T | null> {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = await createHmac(payload);
  if (signature !== expectedSignature) {
    return null;
  }

  const envelope = JSON.parse(decodeUtf8(fromBase64Url(payload))) as SignedEnvelope<T>;
  if (envelope.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return envelope.value;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) {
      return cookies;
    }

    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

export function getCookieValue(request: Request, name: string): string | undefined {
  return parseCookies(request.headers.get("cookie"))[name];
}

export function getCookieOptions(request: Request, maxAgeSeconds: number) {
  const secure = new URL(request.url).protocol === "https:";

  return {
    httpOnly: true,
    maxAge: maxAgeSeconds,
    path: "/",
    sameSite: "lax" as const,
    secure,
  };
}

export function clearCookieOptions(request: Request) {
  const { httpOnly, path, sameSite, secure } = getCookieOptions(request, 0);

  return {
    httpOnly,
    maxAge: 0,
    path,
    sameSite,
    secure,
  };
}

export async function createNonceCookieValue(nonce: string): Promise<string> {
  return encodeSignedValue({ nonce }, NONCE_MAX_AGE_SECONDS);
}

export function createSiweNonce(length = 16): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(randomBytes, (byte) => SIWE_NONCE_ALPHABET[byte % SIWE_NONCE_ALPHABET.length]).join("");
}

export async function readNonceFromRequest(request: Request): Promise<string | null> {
  const value = await decodeSignedValue<{ nonce: string }>(
    getCookieValue(request, SIWE_NONCE_COOKIE)
  );

  return value?.nonce ?? null;
}

export async function createSessionCookieValue(session: AuthSession): Promise<string> {
  return encodeSignedValue<AuthSession>(
    {
      address: session.address.toLowerCase(),
      chainId: session.chainId,
    },
    SESSION_MAX_AGE_SECONDS
  );
}

export async function readSessionFromRequest(request: Request): Promise<AuthSession | null> {
  return decodeSignedValue<AuthSession>(getCookieValue(request, SIWE_SESSION_COOKIE));
}