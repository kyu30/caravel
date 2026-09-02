// @ts-check
import {defineConfig} from 'astro/config'
import sitemap from '@astrojs/sitemap'

import {SITE} from './src/lib/site.js'

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap()],
  build: {
    format: 'file',
  },
  vite: {
    // Surface a clear message instead of a stack trace when env vars are missing.
    define: {},
  },
})
