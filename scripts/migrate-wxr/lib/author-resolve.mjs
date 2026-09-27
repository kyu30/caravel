/**
 * Resolves each legacy `dc:creator` login to one or more Sanity authors:
 * either an existing author (case-insensitive name match) or a new
 * alumni/inactive author doc.
 *
 * Some legacy logins are actually combined co-author bylines (e.g.
 * "AdvaitArunandMaxShmotolokha" / display name "Advait Arun and Max
 * Shmotolokha", sometimes 3-4 names with an Oxford comma). Those are split
 * into individual names -- each resolved (and cached) by name, not by
 * login, so the same person mentioned across several combined bylines maps
 * to one author doc, not a duplicate per combination.
 *
 * Slug convention matches the 72 existing authors exactly: [first
 * initial][lastname], lowercase, no separator (e.g. "emoscovitch") -- a
 * manual house style, not Sanity's own auto-slugify. Collisions fall back
 * to [first two letters][lastname], then a numeric suffix.
 */
function cleanFragment(s) {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function initialLastnameSlug(displayName) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return cleanFragment(displayName)
  const first = parts[0]
  const last = parts[parts.length - 1]
  return cleanFragment(first[0] + last)
}

function twoLetterLastnameSlug(displayName) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return cleanFragment(displayName)
  const first = parts[0]
  const last = parts[parts.length - 1]
  return cleanFragment(first.slice(0, 2) + last)
}

/** "A, B, and C" / "A and B" -> ["A", "B", "C"]. Leaves a normal single name alone. */
export function splitCoAuthors(displayName) {
  const normalized = (displayName ?? '')
    .replace(/,\s*and\s+/gi, ', ')
    .replace(/\s+and\s+/gi, ', ')
  return normalized
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * @param {{liveAuthors: {_id:string,name:string,slug:string}[], wpAuthorsByLogin: Map}} args
 */
export function buildAuthorResolver({liveAuthors, wpAuthorsByLogin}) {
  const byNameLower = new Map(
    liveAuthors.filter((a) => a.name).map((a) => [a.name.trim().toLowerCase(), a]),
  )
  const takenSlugs = new Set(liveAuthors.filter((a) => a.slug).map((a) => a.slug))
  const resolvedByName = new Map()
  const newAuthors = []
  const collisions = []

  function resolveName(displayName) {
    const key = displayName.trim().toLowerCase()
    if (resolvedByName.has(key)) return resolvedByName.get(key)

    const existing = byNameLower.get(key)
    if (existing) {
      const result = {_id: existing._id, name: existing.name, slug: existing.slug, isNew: false}
      resolvedByName.set(key, result)
      return result
    }

    const base = initialLastnameSlug(displayName)
    let slug = base
    let collided = false
    if (takenSlugs.has(slug)) {
      collided = true
      slug = twoLetterLastnameSlug(displayName)
    }
    let n = 2
    while (takenSlugs.has(slug)) {
      slug = `${base}${n}`
      n += 1
    }
    takenSlugs.add(slug)

    const id = `author.wp-${slug}`
    const doc = {
      _id: id,
      _type: 'author',
      name: displayName.trim(),
      slug: {_type: 'slug', current: slug},
      staffGroup: 'alumni',
      active: false,
    }
    const result = {_id: id, name: displayName.trim(), slug, isNew: true, doc}
    resolvedByName.set(key, result)
    newAuthors.push(result)
    if (collided) collisions.push({name: displayName.trim(), slug})
    return result
  }

  /** @returns {Array<{_id,name,slug,isNew}>} one or more resolved authors for this login */
  function resolveLogin(login) {
    const wp = wpAuthorsByLogin.get(login)
    const displayName = (wp?.displayName || login).trim()
    const names = splitCoAuthors(displayName)
    return (names.length > 0 ? names : [displayName]).map(resolveName)
  }

  return {
    resolveLogin,
    get newAuthors() {
      return newAuthors
    },
    get collisions() {
      return collisions
    },
  }
}
