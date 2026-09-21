import {getRegions, getSections} from './queries'

export interface NavLink {
  label: string
  href: string
}
export interface NavGroup {
  label: string
  href?: string
  children: NavLink[]
}

export const ABOUT_LINKS: NavLink[] = [
  {label: 'About / Our History', href: '/about'},
  {label: 'Masthead', href: '/masthead'},
  {label: 'Our Staff', href: '/staff'},
  {label: 'Contact', href: '/contact'},
]

/**
 * Primary navigation: Latest / Archive (top-level) + About / Regions / Compass
 * dropdowns. Built from Sanity taxonomy so new regions/Compass verticals
 * appear automatically. The editorial sections (Opinion & Satire, Travel) sit
 * outside the nav entirely — reachable from the homepage — except Crow's Nest,
 * which is folded into the Regions dropdown alongside the six regions.
 */
export async function getNav(): Promise<NavGroup[]> {
  const [regions, editorial, compass] = await Promise.all([
    getRegions(),
    getSections('editorial'),
    getSections('compass'),
  ])
  const crowsNest = editorial.find((s) => s.slug === 'crows-nest')
  // Only the big regions shown on the homepage map (mapId set) belong in the
  // dropdown — finer-grained country tags also live in `region` docs but
  // aren't map regions and would clutter the nav.
  const mapRegions = regions.filter((r) => r.mapId)

  return [
    {label: 'About', href: '/about', children: ABOUT_LINKS},
    {
      label: 'Regions',
      href: '/regions',
      children: [
        ...mapRegions.map((r) => ({label: r.name, href: `/${r.slug}`})),
        ...(crowsNest ? [{label: crowsNest.name, href: `/${crowsNest.slug}`}] : []),
      ],
    },
    {
      label: 'Compass',
      href: '/compass',
      children: compass.map((s) => ({label: s.name, href: `/${s.slug}`})),
    },
  ]
}
