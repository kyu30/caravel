#!/usr/bin/env node
/**
 * Creates the 3 revived Compass sections (World, Gender, Coin) that the
 * category resolver depends on. Idempotent via createIfNotExists -- safe to
 * re-run. See docs/ARCHIVE_MIGRATION.md.
 *
 * Run from studio/:
 *   npx sanity exec ../scripts/migrate-wxr/01-seed-compass-sections.mjs --with-user-token
 */
import {makeClient} from './lib/sanity-context.mjs'

const SECTIONS = [
  {
    _id: 'section.compass-world',
    _type: 'section',
    name: 'World',
    slug: {_type: 'slug', current: 'world'},
    kind: 'compass',
    order: 10,
    description: 'Compass: dispatches that cut across regions.',
  },
  {
    _id: 'section.compass-gender',
    _type: 'section',
    name: 'Gender',
    slug: {_type: 'slug', current: 'gender'},
    kind: 'compass',
    order: 30,
    description: 'Compass: gender and politics worldwide.',
  },
  {
    _id: 'section.compass-coin',
    _type: 'section',
    name: 'Coin',
    slug: {_type: 'slug', current: 'coin'},
    kind: 'compass',
    order: 40,
    description: 'Compass: money, business, and economics.',
  },
]

async function main() {
  const client = makeClient()
  for (const doc of SECTIONS) {
    const result = await client.createIfNotExists(doc)
    console.log(`${doc._id} -> ${result._id}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
