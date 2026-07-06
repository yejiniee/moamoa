import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { cleanup } from './fixtures/seed'

export default async function globalTeardown() {
  await cleanup()
}
