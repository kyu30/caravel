/**
 * Bundled sample content used until a Sanity project is configured.
 * Shapes here match the *projected* types in types.ts (slugs are strings, each
 * article already has a resolved `url`), NOT the raw Sanity documents.
 */
import type {Article, Author, PortableBlock, Taxonomy} from './types'

const img = (src: string, alt: string, credit = 'Sample photo') => ({src, alt, credit})

export const sampleRegions: Taxonomy[] = [
  {_id: 'r-africa', _type: 'region', name: 'Africa', slug: 'africa', order: 10, mapId: 'africa', description: 'Politics, economics, and society across the African continent.'},
  {_id: 'r-eeca', _type: 'region', name: 'Eastern Europe & Central Asia', shortName: 'E. Europe & C. Asia', slug: 'eastern-europe-central-asia', order: 20, mapId: 'eeca', description: 'From the Baltics to the Caucasus to the steppe.'},
  {_id: 'r-iap', _type: 'region', name: 'Indo-Asia-Pacific', shortName: 'Indo-Pacific', slug: 'indo-asia-pacific', order: 30, mapId: 'iap', description: 'South Asia, East and Southeast Asia, and the Pacific.'},
  {_id: 'r-lac', _type: 'region', name: 'Latin America & The Caribbean', shortName: 'Latin America', slug: 'latin-america-caribbean', order: 40, mapId: 'lac', description: 'Mexico, Central and South America, and the Caribbean.'},
  {_id: 'r-swana', _type: 'region', name: 'Southwest Asia & North Africa', shortName: 'SWANA', slug: 'southwest-asia-north-africa', order: 50, mapId: 'swana', description: 'The Middle East and the Maghreb.'},
  {_id: 'r-wec', _type: 'region', name: 'Western Europe & Canada', shortName: 'W. Europe & Canada', slug: 'western-europe-canada', order: 60, mapId: 'wec', description: 'Western Europe, the Nordics, and Canada.'},
]

export const sampleSections: Taxonomy[] = [
  {_id: 's-opinion', _type: 'section', name: 'Opinion & Satire', slug: 'opinion-satire', kind: 'editorial', order: 10, description: 'Argument, commentary, and satire from our columnists and contributors.'},
  {_id: 's-crows', _type: 'section', name: "Crow's Nest", slug: 'crows-nest', kind: 'editorial', order: 20, description: 'Long-form features and dispatches from the masthead.'},
  {_id: 's-travel', _type: 'section', name: 'Travel', slug: 'travel', kind: 'editorial', order: 30, description: 'Reporting and reflection from the road.'},
  {_id: 's-c-world', _type: 'section', name: 'World', slug: 'world', kind: 'compass', order: 10, description: 'Compass: the through-line stories shaping global affairs.'},
  {_id: 's-c-elections', _type: 'section', name: 'Elections', slug: 'elections', kind: 'compass', order: 20, description: 'Compass: campaigns, ballots, and transfers of power worldwide.'},
  {_id: 's-c-gender', _type: 'section', name: 'Gender', slug: 'gender', kind: 'compass', order: 30, description: 'Compass: gender, power, and rights across borders.'},
  {_id: 's-c-coin', _type: 'section', name: 'Coin', slug: 'coin', kind: 'compass', order: 40, description: 'Compass: trade, markets, and the global economy.'},
  {_id: 's-c-futures', _type: 'section', name: 'Futures', slug: 'futures', kind: 'compass', order: 50, description: 'Compass: technology, security, and what comes next.'},
  {_id: 's-c-planet', _type: 'section', name: 'Planet', slug: 'planet', kind: 'compass', order: 60, description: 'Compass: climate, energy, and the environment.'},
]

export const sampleAuthors: Author[] = [
  {
    _id: 'a-rivera', name: 'Mara Rivera', slug: 'mara-rivera', role: 'Editor-in-Chief', staffGroup: 'masthead', active: true,
    headshot: img('/images/avatar.svg', 'Mara Rivera'),
    bio: [para('Mara is a senior in the School of Foreign Service studying International Politics. She has covered SWANA and elections for The Caravel since her first year.')],
    socialLinks: [{platform: 'twitter', url: 'https://twitter.com/'}],
  },
  {
    _id: 'a-osei', name: 'Daniel Osei', slug: 'daniel-osei', role: 'Managing Editor', staffGroup: 'masthead', active: true,
    headshot: img('/images/avatar.svg', 'Daniel Osei'),
    bio: [para('Daniel studies Economics and writes on trade and development across West Africa.')],
  },
  {
    _id: 'a-kim', name: 'Grace Kim', slug: 'grace-kim', role: 'Indo-Asia-Pacific Editor', staffGroup: 'section-editors', active: true,
    headshot: img('/images/avatar.svg', 'Grace Kim'),
    bio: [para('Grace covers security and technology in the Indo-Pacific.')],
  },
  {
    _id: 'a-costa', name: 'Luca Costa', slug: 'luca-costa', role: 'Staff Writer', staffGroup: 'staff-writers', active: true,
    headshot: img('/images/avatar.svg', 'Luca Costa'),
    bio: [para('Luca is a sophomore writing on Western Europe and climate policy.')],
  },
  {
    _id: 'a-haddad', name: 'Nadia Haddad', slug: 'nadia-haddad', role: 'Former Editor-in-Chief', staffGroup: 'alumni', active: false,
    headshot: img('/images/avatar.svg', 'Nadia Haddad'),
    bio: [para('Nadia led The Caravel in 2022–23 and now reports from Amman.')],
  },
]

function para(text: string): PortableBlock {
  return {
    _type: 'block',
    _key: keyFor(text),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keyFor(text) + 's', text, marks: []}],
  }
}
function keyFor(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return 'k' + Math.abs(h).toString(36)
}

const authorRef = (a: Author) => ({_id: a._id, name: a.name, slug: a.slug, role: a.role})
const taxRef = (t: Taxonomy) => ({_id: t._id, _type: t._type, name: t.name, slug: t.slug})

interface SampleInput {
  id: string
  title: string
  slug: string
  subtitle?: string
  excerpt: string
  date: string
  featured?: boolean
  primary: Taxonomy
  regions?: Taxonomy[]
  compass?: Taxonomy[]
  authors: Author[]
  hero: {src: string; alt: string; credit?: string}
  body?: string[]
}

const R = Object.fromEntries(sampleRegions.map((r) => [r.slug, r])) as Record<string, Taxonomy>
const S = Object.fromEntries(sampleSections.map((s) => [s.slug, s])) as Record<string, Taxonomy>
const A = Object.fromEntries(sampleAuthors.map((a) => [a.slug, a])) as Record<string, Author>

const inputs: SampleInput[] = [
  {
    id: 'art-1', title: 'Coalition talks collapse in Vienna as far-right gains reshape the map',
    slug: 'vienna-coalition-talks-collapse', subtitle: 'Three weeks of negotiations end without a government, forcing a second round of talks.',
    excerpt: 'Austria’s mainstream parties failed to agree on a governing coalition, leaving the country in political limbo weeks after an election that reordered its parliament.',
    date: daysAgo(1), featured: true, primary: R['western-europe-canada'], regions: [R['western-europe-canada']],
    compass: [S['elections'], S['world']], authors: [A['luca-costa'], A['mara-rivera']],
    hero: img('/images/placeholder-wide.svg', 'Parliament building at dusk'),
    body: [
      'Coalition negotiations in Vienna broke down on Tuesday after the two largest parties failed to bridge differences on migration and budget policy, according to officials familiar with the talks.',
      'The collapse sets up a second round of negotiations and raises the prospect of a minority government — an arrangement Austria has largely avoided in the postwar period.',
      'Analysts said the result reflected a broader pattern across Western Europe, where established parties have struggled to assemble stable majorities.',
    ],
  },
  {
    id: 'art-2', title: 'In Nairobi, a fintech boom runs ahead of its regulators',
    slug: 'nairobi-fintech-boom-regulators', subtitle: 'Mobile lending has reached millions. Oversight has not kept pace.',
    excerpt: 'Kenya’s digital lending sector has expanded faster than the rules meant to govern it, leaving borrowers exposed and regulators playing catch-up.',
    date: daysAgo(3), featured: true, primary: R['africa'], regions: [R['africa']], compass: [S['coin']],
    authors: [A['daniel-osei']], hero: img('/images/placeholder-wide.svg', 'City skyline'),
    body: [
      'A wave of mobile lending apps has transformed access to credit in Kenya, but consumer advocates warn that interest rates and collection practices remain poorly policed.',
      'The Central Bank has moved to license digital lenders, yet enforcement capacity is thin and many operators fall outside its remit.',
    ],
  },
  {
    id: 'art-3', title: 'The Pacific’s new undersea cables are also a security contest',
    slug: 'pacific-undersea-cables-security', excerpt: 'Island nations weigh competing offers to build the infrastructure that carries their internet — and the strategic strings attached.',
    date: daysAgo(4), primary: S['futures'], regions: [R['indo-asia-pacific']], compass: [S['futures'], S['world']],
    authors: [A['grace-kim']], hero: img('/images/placeholder-wide.svg', 'Ocean horizon'),
  },
  {
    id: 'art-4', title: 'Opinion: Georgetown should teach the Sahel, not skip it',
    slug: 'opinion-teach-the-sahel', subtitle: 'Our curriculum treats a region of 300 million people as a footnote.',
    excerpt: 'The Sahel is central to debates on climate, migration, and security. Our course catalog barely mentions it.',
    date: daysAgo(6), primary: S['opinion-satire'], regions: [R['africa']], authors: [A['mara-rivera']],
    hero: img('/images/placeholder-portrait.svg', 'Lecture hall'),
    body: [
      'Every year, students arrive at Georgetown expecting to study the world. Every year, the Sahel is missing from their options.',
      'This is a choice, and it is the wrong one.',
    ],
  },
  {
    id: 'art-5', title: 'Notes from a night train across the Carpathians',
    slug: 'night-train-carpathians', excerpt: 'Twelve hours, four border checks, and a dining car that never opened: crossing Eastern Europe the slow way.',
    date: daysAgo(9), primary: S['travel'], regions: [R['eastern-europe-central-asia']], authors: [A['luca-costa']],
    hero: img('/images/placeholder-wide.svg', 'Train window at night'),
  },
  {
    id: 'art-6', title: 'Brazil’s supreme court test for platform liability, explained',
    slug: 'brazil-platform-liability-explained', excerpt: 'A ruling expected this term could rewrite the rules for social media across Latin America.',
    date: daysAgo(11), primary: R['latin-america-caribbean'], regions: [R['latin-america-caribbean']], compass: [S['futures']],
    authors: [A['grace-kim'], A['daniel-osei']], hero: img('/images/placeholder-wide.svg', 'Courthouse columns'),
  },
  {
    id: 'art-7', title: 'Women candidates broke records in three SWANA elections. Then came the math.',
    slug: 'swana-women-candidates-records', subtitle: 'Historic nominations did not translate into proportional seats.',
    excerpt: 'Across three recent votes, women stood for office in unprecedented numbers — and electoral systems blunted the result.',
    date: daysAgo(14), featured: true, primary: S['gender'], regions: [R['southwest-asia-north-africa']],
    compass: [S['gender'], S['elections']], authors: [A['mara-rivera'], A['nadia-haddad']],
    hero: img('/images/placeholder-wide.svg', 'Polling station'),
    body: [
      'In three SWANA elections held over the past year, a record share of candidates were women. The share of women elected barely moved.',
      'The gap, analysts say, is structural: party list placement, district magnitude, and incumbency all work against newcomers.',
    ],
  },
]

function daysAgo(n: number): string {
  const d = new Date()
  d.setUTCHours(12, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

export const sampleArticles: Article[] = inputs.map((i) => ({
  _id: i.id,
  title: i.title,
  slug: i.slug,
  url: `/${i.primary.slug}/${i.slug}`,
  subtitle: i.subtitle,
  excerpt: i.excerpt,
  publishDate: i.date,
  featured: i.featured ?? false,
  heroImage: i.hero,
  authors: i.authors.map(authorRef),
  primarySection: taxRef(i.primary),
  regions: (i.regions ?? []).map(taxRef),
  compassTopics: (i.compass ?? []).map(taxRef),
  body: i.body?.map(para),
}))
