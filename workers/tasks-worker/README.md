# cft-tasks-worker

Cloudflare Worker that stores contributor tasks in **D1**.

## Local dev

1) Create a D1 database (once):

- `wrangler d1 create cft_tasks`

2) Put the generated `database_id` into [wrangler.jsonc](wrangler.jsonc).

3) Apply migrations:

- `wrangler d1 migrations apply cft_tasks --local`

4) Run:

- `pnpm dev`

## Endpoints (v1)

- `GET /health`
- `GET /tasks?status=&type=&q=&tags=a,b&limit=&cursor=`
- `POST /tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id`
- `POST /tasks/:id/comments`
- `POST /tasks/:id/pr-links`
- `PUT /tasks/:id/contributions`

Access control is intentionally out-of-scope for v1.
