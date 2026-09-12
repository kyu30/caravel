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
  {label: 'Bunn Award Winners', href: '/bunn-award-winners'},
  {label: 'Join Our Team', href: '/join'},
  {label: 'Contact', href: '/contact'},
  {label: 'Ethics Policy', href: '/ethics-policy'},
]

/**
 * Primary navigation, mirroring the current site's dropdown structure
 * (About / Regions / Sections / Compass). Built from Sanity taxonomy so new
 * sections appear automatically.
 */
export async function getNav(): Promise<NavGroup[]> {
  const [regions, editorial, compass] = await Promise.all([
    getRegions(),
    getSections('editorial'),
    getSections('compass'),
  ])

  return [
    {label: 'About', href: '/about', children: ABOUT_LINKS},
    {
      label: 'Regions',
      href: '/regions',
      children: regions.map((r) => ({label: r.name, href: `/${r.slug}`})),
    },
    {
      label: 'Sections',
      children: [
        ...editorial.map((s) => ({label: s.name, href: `/${s.slug}`})),
        {label: 'Latest', href: '/latest'},
        {label: 'Archive', href: '/archive'},
      ],
    },
    {
      label: 'Compass',
      href: '/compass',
      children: compass.map((s) => ({label: s.name, href: `/${s.slug}`})),
    },
  ]
}
