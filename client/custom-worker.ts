// Custom worker that re-exports the generated OpenNext handler
// See: https://opennext.js.org/cloudflare/howtos/custom-worker

// @ts-expect-error `.open-next/worker.js` is generated at build time
import handler from "./.open-next/worker.js";

// Export the fetch handler from OpenNext (all requests go through Next.js)
export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    return handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareEnv>;
