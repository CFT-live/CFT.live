import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from the root directory (parent of client folder)
config({ path: resolve(__dirname, '../.env') });

const nextConfig: NextConfig = {
  /* config options here */
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
// Uses wrangler.dev.jsonc which excludes Durable Objects to prevent noisy warnings
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev({
  configPath: './wrangler.dev.jsonc',
});