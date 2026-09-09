// @ts-check
import {defineConfig} from 'astro/config'
import sitemap from '@astrojs/sitemap'

import {SITE} from './src/lib/site.js'

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  output: 'static',
  // Default 'directory' format → /africa/index.html, which Vercel's static
  // hosting serves at /africa. 'file' format (africa.html) needs cleanUrls and
  // broke routing on Vercel.
  trailingSlash: 'never',
  integrations: [sitemap()],
})
