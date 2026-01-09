# CFT Chat Worker

A Cloudflare Worker providing real-time chat functionality for CFT.live.

## Features

- Message persistence using Durable Objects (stores last 100 messages)
- CORS support for cross-origin requests
- Ethereum wallet address validation

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/messages` | Fetch all messages |
| POST | `/messages` | Send a new message |
| GET | `/health` | Health check |

### POST /messages

Request body:
```json
{
  "address": "0x...", // Ethereum wallet address (required)
  "content": "Hello!" // Message content, max 500 chars (required)
}
```

Response:
```json
{
  "message": {
    "id": "1234567890-abc123",
    "address": "0x...",
    "content": "Hello!",
    "timestamp": 1234567890000
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Run locally
pnpm dev

# Deploy to Cloudflare
pnpm deploy
```

## Environment Variables

Set in `wrangler.jsonc`:
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS

## Deployment

The worker is deployed to `cft-chat-worker.workers.dev` by default.
Update the client's `CHAT_WORKER_URL` environment variable to point to the deployed worker URL.
