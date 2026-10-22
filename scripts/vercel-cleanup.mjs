#!/usr/bin/env node
/**
 * Lists and deletes old Vercel deployments to reclaim Deployment Storage.
 * Never touches the current production deployment, and always keeps a
 * safety buffer of the most recent deployments for rollback.
 *
 * Reads the API token from ~/.vercel-cleanup-token (not the repo, not an
 * env var -- shell state doesn't persist between tool calls in this
 * session, a file does).
 *
 * Run:
 *   node scripts/vercel-cleanup.mjs --project=prj_xxx [--team=team_xxx] --dry-run
 *   node scripts/vercel-cleanup.mjs --project=prj_xxx [--team=team_xxx] [--keep=10]
 */
import {readFileSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const projectArg = args.find((a) => a.startsWith('--project='))
const teamArg = args.find((a) => a.startsWith('--team='))
const keepArg = args.find((a) => a.startsWith('--keep='))
const PROJECT_ID = projectArg?.slice('--project='.length)
const TEAM_ID = teamArg?.slice('--team='.length)
const KEEP_RECENT = keepArg ? Number(keepArg.slice('--keep='.length)) : 10

if (!PROJECT_ID) {
  console.error('Usage: --project=prj_xxx [--team=team_xxx] [--keep=10] [--dry-run]')
  process.exit(1)
}

const TOKEN = readFileSync(path.join(os.homedir(), '.vercel-cleanup-token'), 'utf-8').trim()

const API = 'https://api.vercel.com'
function qs(params) {
  const p = new URLSearchParams({...params, ...(TEAM_ID ? {teamId: TEAM_ID} : {})})
  return p.toString()
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

async function listAllDeployments() {
  const all = []
  let until
  for (;;) {
    const page = await vercelFetch('/v6/deployments', {
      projectId: PROJECT_ID,
      limit: '100',
      ...(until ? {until: String(until)} : {}),
    })
    all.push(...page.deployments)
    if (!page.pagination?.next) break
    until = page.pagination.next
  }
  return all
}

async function main() {
  console.log('Fetching deployment list...')
  const deployments = await listAllDeployments()
  console.log(`${deployments.length} total deployment(s)`)

  deployments.sort((a, b) => b.created - a.created)

  const prod = deployments.find((d) => d.target === 'production' && d.readyState === 'READY')
  const keepIds = new Set()
  if (prod) keepIds.add(prod.uid)
  for (const d of deployments.slice(0, KEEP_RECENT)) keepIds.add(d.uid)

  const toDelete = deployments.filter((d) => !keepIds.has(d.uid))
  const toKeep = deployments.filter((d) => keepIds.has(d.uid))

  console.log(`\nKeeping ${toKeep.length}:`)
  console.log(`  current production: ${prod ? `${prod.uid} (${new Date(prod.created).toISOString()})` : 'NOT FOUND -- check manually before proceeding'}`)
  console.log(`  + most recent ${KEEP_RECENT} regardless of target`)

  console.log(`\nWould delete ${toDelete.length} deployment(s), date range:`)
  if (toDelete.length) {
    console.log(`  oldest: ${new Date(toDelete[toDelete.length - 1].created).toISOString()}`)
    console.log(`  newest: ${new Date(toDelete[0].created).toISOString()}`)
  }

  if (DRY_RUN) {
    console.log('\nFirst 20 to delete:')
    toDelete.slice(0, 20).forEach((d) => console.log(`  ${d.uid}  ${new Date(d.created).toISOString()}  target=${d.target ?? 'preview'}  state=${d.readyState}  ${d.url}`))
    console.log('\nDry run -- nothing deleted.')
    return
  }

  if (!prod) {
    console.error('\nRefusing to delete: could not identify the current production deployment. Re-run with --dry-run and check manually.')
    process.exit(1)
  }

  let deleted = 0
  let failed = 0
  for (const d of toDelete) {
    try {
      await vercelFetch(`/v13/deployments/${d.uid}`, {}, {method: 'DELETE'})
      deleted++
    } catch (err) {
      failed++
      console.log(`  FAILED ${d.uid}: ${err.message}`)
    }
    if ((deleted + failed) % 20 === 0) console.log(`  ${deleted + failed}/${toDelete.length}`)
    await new Promise((r) => setTimeout(r, 150)) // light rate-limit courtesy
  }

  console.log(`\nDeleted ${deleted}, failed ${failed}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
