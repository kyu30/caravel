import type {APIRoute} from 'astro'
import {getSearchIndex} from '../lib/queries'

// Prerendered to /search-index.json at build time. Consumed by /search.
export const GET: APIRoute = async () => {
  const records = await getSearchIndex()
  return new Response(JSON.stringify(records), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=600',
    },
  })
}
