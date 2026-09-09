import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  /**
   * Studio is deployed with `npm run studio:deploy` (from repo root).
   * It will be hosted at https://<studioHost>.sanity.studio
   * Set `studioHost` here or you'll be prompted on first deploy.
   */
  studioHost: 'thecaravelgu',
  deployment: {autoUpdates: true, appId: 'h1b3tv6jnynyep72ji1c7sxw'},
})
