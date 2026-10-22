#!/usr/bin/env node
/**
 * Triggers one manual production redeploy via the Vercel API, by cloning the
 * current production deployment's git source (same mechanism as the
 * dashboard's "Redeploy" button). Used instead of leaving the Sanity ->
 * Vercel webhook on, since that webhook caused a rebuild-storm incident.
 *
 * Reads the API token from ~/.vercel-cleanup-token (see vercel-cleanup.mjs).
 *
 * Run:
 *   node scripts/vercel-redeploy.mjs --project=prj_xxx [--team=team_xxx]
 */
import {readFileSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const projectArg = args.find((a) => a.startsWith('--project='))
const teamArg = args.find((a) => a.startsWith('--team='))
const PROJECT_ID = projectArg?.slice('--project='.length)
const TEAM_ID = teamArg?.slice('--team='.length)

if (!PROJECT_ID) {
  console.error('Usage: --project=prj_xxx [--team=team_xxx]')
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
    headers: {Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(options.headers ?? {})},
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 500)}`)
  }
  return res.json()
}

async function main() {
  console.log('Finding current production deployment...')
  const {deployments} = await vercelFetch('/v6/deployments', {projectId: PROJECT_ID, limit: '20', target: 'production'})
  const prod = deployments.find((d) => d.readyState === 'READY')
  if (!prod) throw new Error('Could not find a READY production deployment to clone.')
  console.log(`Cloning deployment ${prod.uid} (${new Date(prod.created).toISOString()})`)

  const created = await vercelFetch(
    '/v13/deployments',
    {forceNew: '1'},
    {
      method: 'POST',
      body: JSON.stringify({
        name: prod.name,
        deploymentId: prod.uid,
        target: 'production',
      }),
    },
  )
  console.log(`New deployment: ${created.id} -- ${created.url}`)

  console.log('Polling for build completion...')
  for (;;) {
    await new Promise((r) => setTimeout(r, 5000))
    const status = await vercelFetch(`/v13/deployments/${created.id}`)
    console.log(`  state: ${status.readyState}`)
    if (status.readyState === 'READY') {
      console.log(`\nDeployed: https://${status.url}`)
      break
    }
    if (status.readyState === 'ERROR' || status.readyState === 'CANCELED') {
      throw new Error(`Deployment ended in state ${status.readyState}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
