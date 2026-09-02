import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {deskStructure} from './deskStructure'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'your_project_id'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

export default defineConfig({
  name: 'default',
  title: 'The Caravel',

  projectId,
  dataset,

  plugins: [
    structureTool({structure: deskStructure}),
    visionTool({defaultApiVersion: '2024-10-01'}),
  ],

  schema: {
    types: schemaTypes,
  },
})
