import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { seed } from './fixtures/seed'

export default async function globalSetup() {
  await seed()
}
