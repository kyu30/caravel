import {createClient, type SanityClient} from '@sanity/client'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production'
const token = import.meta.env.SANITY_API_READ_TOKEN || undefined

/**
 * `true` when no Sanity project is configured yet. In that mode every data
 * helper in `queries.ts` returns bundled sample content so the front end still
 * builds and renders. See src/lib/sampleData.ts.
 */
export const USE_SAMPLE_DATA = !projectId

export const sanityClient: SanityClient | null = USE_SAMPLE_DATA
  ? null
  : createClient({
      projectId,
      dataset,
      apiVersion: '2024-10-01',
      // Static build: CDN is fine and cheaper. Flip to false if you wire ISR later.
      useCdn: true,
      perspective: 'published',
      token,
    })

if (USE_SAMPLE_DATA) {
  // eslint-disable-next-line no-console
  console.warn(
    '\n[caravel] PUBLIC_SANITY_PROJECT_ID is not set — using bundled sample content.\n' +
      '          Set it in web/.env to pull live data. See /SETUP.md.\n',
  )
}
