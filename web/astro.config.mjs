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
  integrations: [
    sitemap({
      // Tag pages (3,700+, many with just 1-2 articles) are real
      // on-site navigation but not worth the recurring crawl budget --
      // excluded from the sitemap and disallowed in robots.txt.
      filter: (page) => !page.includes('/tag/'),
    }),
  ],
})
