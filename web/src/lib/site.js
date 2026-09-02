/**
 * Site-wide constants. Plain JS so `astro.config.mjs` can import it too.
 */
export const SITE = {
  name: 'The Caravel',
  tagline: "Georgetown University's student-run international affairs newspaper",
  // Update to the production domain before launch.
  url: 'https://www.thecaravelgu.com',
  founded: 2011,
  // Buttondown newsletter — embed/link only for now.
  newsletterUrl: 'https://buttondown.com/thecaravel',
  social: {
    instagram: 'https://www.instagram.com/thecaravelgu',
    twitter: 'https://twitter.com/thecaravelgu',
  },
  submissionFormUrl: 'https://forms.gle/REPLACE_WITH_GOOGLE_FORM_ID',
}
