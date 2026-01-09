# CFT Advance Worker

A Cloudflare Worker that periodically calls the advance API endpoint to progress prediction market rounds.

## Architecture

- **Cron Trigger**: Runs every minute (`* * * * *`)
- **KV Storage**: Stores the next scheduled check time to enable dynamic intervals
- **API Key Protection**: Both the API endpoint and worker use the same secret API key

## Setup

### 1. Create KV Namespace

```bash
# Create the KV namespace
cd workers/advance-worker
wrangler kv namespace create ADVANCE_STATE

# This will output something like:
# ✅ Created namespace "cft-advance-worker-ADVANCE_STATE" with ID "abc123..."
```

Update the `wrangler.jsonc` file with the returned KV namespace ID:
```json
"kv_namespaces": [
    {
        "binding": "ADVANCE_STATE",
        "id": "YOUR_KV_NAMESPACE_ID_HERE"
    }
]
```

### 2. Generate API Key

Generate a secure random API key:
```bash
openssl rand -hex 32
```

### 3. Set Secrets

#### For the Advance Worker:
```bash
cd workers/advance-worker
wrangler secret put ADVANCE_API_KEY
# Paste your generated API key when prompted
```

#### For the Main Application:
Add the same API key to your Cloudflare Pages/Worker environment:
```bash
# In the client directory
wrangler secret put ADVANCE_API_KEY
# Paste the same API key
```

Or add it via the Cloudflare Dashboard:
1. Go to Workers & Pages > cft > Settings > Environment Variables
2. Add `ADVANCE_API_KEY` as an encrypted variable

### 4. Update API Base URL (if needed)

The default `API_BASE_URL` is set to `https://cft.live`. If you're deploying to a different domain, update it in `wrangler.jsonc`:

```json
"vars": {
    "API_BASE_URL": "https://your-domain.com"
}
```

### 5. Deploy the Worker

```bash
cd workers/advance-worker
pnpm install
wrangler deploy
```

## Development

### Local Testing

```bash
cd workers/advance-worker
pnpm dev
```

The worker exposes these HTTP endpoints for testing:
- `GET /health` - Health check
- `GET /status` - Show next scheduled check time
- `POST /trigger` - Manually trigger advance check (requires API key header)

### View Logs

```bash
wrangler tail
```

## How It Works

1. **Cron runs every minute**: The Cloudflare cron trigger executes the worker every minute
2. **Check KV for timing**: The worker checks KV storage to see if enough time has passed since the last check
3. **Call API if needed**: If it's time, the worker calls `POST /api/advance` with the API key
4. **Update next check time**: Based on the API response, the worker stores when to run next in KV
5. **Skip if not time**: On subsequent cron runs, if not enough time has passed, the worker exits early

This approach gives sub-minute precision when needed (for active rounds) while avoiding unnecessary API calls during quiet periods.

## Troubleshooting

### Worker not calling API
- Check that `ADVANCE_API_KEY` is set correctly in both the worker and main app
- Verify the `API_BASE_URL` is correct
- Check worker logs with `wrangler tail`

### KV errors
- Ensure the KV namespace ID in `wrangler.jsonc` matches the created namespace
- Verify the binding name is `ADVANCE_STATE`

### API returning 401
- The API key doesn't match between worker and main app
- Regenerate and re-set the secret in both places
