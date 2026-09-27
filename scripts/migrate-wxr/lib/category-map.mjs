/**
 * Legacy Squarespace `category domain="category"` nicename -> current-site
 * taxonomy target. See docs/ARCHIVE_MIGRATION.md's mapping table for the
 * reasoning behind every row (direct match vs. lossy-approximate-with-audit-
 * tag vs. intentionally unmapped).
 *
 * `pending: true` marks a section that doesn't exist live yet but WILL after
 * 01-seed-compass-sections.mjs runs (World/Gender/Coin) — the resolver
 * treats these as valid targets without requiring them to already exist,
 * since a dry run should be runnable before that seed step.
 */
export const CATEGORY_MAP = {
  // --- direct, high-confidence ---
  'western-europe-canada': {type: 'region', slug: 'western-europe-canada'},
  'latin-america-caribbean': {type: 'region', slug: 'latin-america-caribbean'},
  'indo-asia-pacific': {type: 'region', slug: 'indo-asia-pacific'},
  africa: {type: 'region', slug: 'africa'},
  'united-states-of-america': {type: 'region', slug: 'usa'},
  opinion: {type: 'section', slug: 'opinion-satire', kind: 'editorial'},
  satire: {type: 'section', slug: 'opinion-satire', kind: 'editorial'},
  'compass-elections': {type: 'section', slug: 'elections', kind: 'compass'},
  'compass-planet': {type: 'section', slug: 'planet', kind: 'compass'},
  travel: {type: 'section', slug: 'travel', kind: 'editorial'},
  'crows-nest': {type: 'section', slug: 'crows-nest', kind: 'editorial'},
  'compass-world': {type: 'section', slug: 'world', kind: 'compass', pending: true},
  'compass-money': {type: 'section', slug: 'coin', kind: 'compass', pending: true},
  // not a primarySection candidate at all -- becomes a plain tag instead
  'bunn-award-winner': {primaryCandidate: false, badgeTag: 'Bunn Award Winner'},

  // --- lossy/approximate: mapped to the closest real target, plus an
  // audit tag so an editor can find + re-bucket these later via /tag/ ---
  'middle-east-cent-asia': {
    type: 'region',
    slug: 'southwest-asia-north-africa',
    lossy: true,
    auditTag: 'Legacy: Middle East & Cent. Asia',
  },
  'eastern-europe-russia': {
    type: 'region',
    slug: 'eastern-europe-central-asia',
    lossy: true,
    auditTag: 'Legacy: Eastern Europe & Russia',
  },
  gender: {type: 'section', slug: 'gender', kind: 'compass', pending: true, lossy: true, auditTag: 'Legacy: Gender'},
  'business-economics': {
    type: 'section',
    slug: 'coin',
    kind: 'compass',
    pending: true,
    lossy: true,
    auditTag: 'Legacy: Business & Economics',
  },
  'business-amp-economics': {
    type: 'section',
    slug: 'coin',
    kind: 'compass',
    pending: true,
    lossy: true,
    auditTag: 'Legacy: Business & Economics',
  },
  // 'science-technology' intentionally absent: no confident target exists.
}

function resolveDocId(target, ctx) {
  if (target.type === 'region') {
    const doc = ctx.regionsBySlug.get(target.slug)
    if (!doc) throw new Error(`category-map: live region "${target.slug}" not found`)
    return doc._id
  }
  const doc = ctx.sectionsBySlug.get(target.slug)
  if (doc) return doc._id
  if (target.pending) return `section.compass-${target.slug}`
  throw new Error(`category-map: live section "${target.slug}" not found`)
}

function dedupeBySlug(targets) {
  const seen = new Map()
  for (const t of targets) if (!seen.has(t.slug)) seen.set(t.slug, t)
  return [...seen.values()]
}

/**
 * @param {{categories: {nicename:string, display:string}[]}} item
 * @param {{regionsBySlug: Map, sectionsBySlug: Map}} ctx
 */
export function resolveTaxonomy(item, ctx) {
  const candidates = item.categories.filter((c) => CATEGORY_MAP[c.nicename]?.primaryCandidate !== false)
  const resolved = candidates.map((c) => CATEGORY_MAP[c.nicename] ?? null)

  const regionTargets = resolved.filter((r) => r?.type === 'region')
  const editorialTargets = resolved.filter((r) => r?.type === 'section' && r.kind === 'editorial')
  const compassTargets = resolved.filter((r) => r?.type === 'section' && r.kind === 'compass')

  const primary = regionTargets[0] ?? editorialTargets[0] ?? compassTargets[0] ?? null

  if (!primary) {
    return {
      ok: false,
      reason: item.categories.length === 0 ? 'no-category' : 'only-unmapped-category',
    }
  }

  const regions = dedupeBySlug(regionTargets)
  const compassTopics = dedupeBySlug(compassTargets)
  const auditTags = [...new Set(resolved.filter((r) => r?.lossy).map((r) => r.auditTag))]
  const badgeTags = item.categories.some((c) => c.nicename === 'bunn-award-winner') ? ['Bunn Award Winner'] : []
  const hasUnmappedSecondary = item.categories.some((c) => !CATEGORY_MAP[c.nicename])

  return {
    ok: true,
    primaryId: resolveDocId(primary, ctx),
    regionIds: regions.map((r) => resolveDocId(r, ctx)),
    compassTopicIds: compassTopics.map((c) => resolveDocId(c, ctx)),
    auditTags,
    badgeTags,
    hasUnmappedSecondary,
  }
}
