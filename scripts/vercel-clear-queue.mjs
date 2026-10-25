#!/usr/bin/env node
/**
 * Cancels all QUEUED/BUILDING deployments except the single most recent one.
 * Useful when a webhook storm (or several quick pushes) backs up the build
 * queue with redundant deployments of the same or superseded commits.
 *
 * Reads the API token from ~/.vercel-cleanup-token (see vercel-cleanup.mjs).
 *
 * Run:
 *   node scripts/vercel-clear-queue.mjs --project=prj_xxx [--team=team_xxx] --dry-run
 *   node scripts/vercel-clear-queue.mjs --project=prj_xxx [--team=team_xxx]
 */
import {readFileSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const projectArg = args.find((a) => a.startsWith('--project='))
const teamArg = args.find((a) => a.startsWith('--team='))
const PROJECT_ID = projectArg?.slice('--project='.length)
const TEAM_ID = teamArg?.slice('--team='.length)

if (!PROJECT_ID) {
  console.error('Usage: --project=prj_xxx [--team=team_xxx] [--dry-run]')
  process.exit(1)
}

const TOKEN = readFileSync(path.join(os.homedir(), '.vercel-cleanup-token'), 'utf-8').trim()
const API = 'https://api.vercel.com'

function qs(params = {}) {
  return new URLSearchParams({...params, ...(TEAM_ID ? {teamId: TEAM_ID} : {})}).toString()
}
async function vercelFetch(urlPath, params = {}, options = {}) {
  const res = await fetch(`${API}${urlPath}?${qs(params)}`, {
    ...options,
    headers: {Authorization: `Bearer ${TOKEN}`, ...(options.headers ?? {})},
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

async function main() {
  console.log('Fetching deployment list...')
  const {deployments} = await vercelFetch('/v6/deployments', {projectId: PROJECT_ID, limit: '100'})

  const active = deployments
    .filter((d) => d.readyState === 'QUEUED' || d.readyState === 'BUILDING' || d.readyState === 'INITIALIZING')
    .sort((a, b) => b.created - a.created)

  console.log(`${active.length} active deployment(s) (QUEUED/BUILDING/INITIALIZING)`)
  if (active.length <= 1) {
    console.log('Nothing to cancel.')
    return
  }

  const [keep, ...toCancel] = active
  console.log(`\nKeeping most recent: ${keep.uid}  ${new Date(keep.created).toISOString()}  ${keep.readyState}`)
  console.log(`\nWould cancel ${toCancel.length}:`)
  toCancel.forEach((d) => console.log(`  ${d.uid}  ${new Date(d.created).toISOString()}  ${d.readyState}  ${d.url}`))

  if (DRY_RUN) {
    console.log('\nDry run -- nothing canceled.')
    return
  }

  let canceled = 0
  let failed = 0
  for (const d of toCancel) {
    try {
      await vercelFetch(`/v13/deployments/${d.uid}`, {}, {method: 'DELETE'})
      canceled++
    } catch (err) {
      failed++
      console.log(`  FAILED ${d.uid}: ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, 150))
  }
  console.log(`\nCanceled ${canceled}, failed ${failed}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
