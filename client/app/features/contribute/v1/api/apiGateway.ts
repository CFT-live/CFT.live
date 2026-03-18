type ApiGatewayConfig = {
  baseUrl: string;
  apiKey: string;
};

function getConfig(): ApiGatewayConfig {
  const baseUrl = process.env.API_GATEWAY_URL;
  const apiKey = process.env.API_GATEWAY_API_KEY;

  if (!baseUrl) throw new Error("Missing API_GATEWAY_URL env var");
  if (!apiKey) throw new Error("Missing API_GATEWAY_API_KEY env var");

  return { baseUrl, apiKey };
}

function joinUrl(baseUrl: string, path: string): string {
  const b = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export async function apiGatewayPost<T>(path: string, body: unknown): Promise<T> {
  const { baseUrl, apiKey } = getConfig();

  const res = await fetch(joinUrl(baseUrl, path), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `API Gateway error: ${res.status}`);
  }

  return (text ? (JSON.parse(text) as T) : ({} as T));
}
