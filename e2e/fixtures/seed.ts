import { createClient } from '@supabase/supabase-js'
import { writeFileSync, readFileSync } from 'fs'
import path from 'path'

const FIXTURE_PATH = path.join(__dirname, '..', '.fixtures.json')

export type Fixture = {
  testUserId: string
  testUserEmail: string
  testUserPassword: string
  fundingId: string
  fundingToken: string
  giftId: string
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'E2E 테스트에는 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다. .env.local을 확인하세요.'
    )
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function seed(): Promise<Fixture> {
  const supabase = adminClient()
  const stamp = Date.now()
  const testUserEmail = `e2e-${stamp}@moamoa-test.local`
  const testUserPassword = `E2eTest!${stamp}`

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: testUserEmail,
    password: testUserPassword,
    email_confirm: true,
  })
  if (userError || !userData.user) {
    throw new Error(`테스트 유저 생성 실패: ${userError?.message}`)
  }

  const fundingToken = `e2e${stamp}`
  const { data: funding, error: fundingError } = await supabase
    .from('fundings')
    .insert({
      creator_user_id: userData.user.id,
      title: '[E2E] 테스트 펀딩',
      description: 'Playwright E2E 테스트용으로 자동 생성된 펀딩입니다',
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      share_token: fundingToken,
      status: 'active',
    })
    .select()
    .single()
  if (fundingError || !funding) {
    throw new Error(`테스트 펀딩 생성 실패: ${fundingError?.message}`)
  }

  const { data: gift, error: giftError } = await supabase
    .from('gifts')
    .insert({ funding_id: funding.id, name: '테스트 선물', target_amount: 100_000 })
    .select()
    .single()
  if (giftError || !gift) {
    throw new Error(`테스트 선물 생성 실패: ${giftError?.message}`)
  }

  const fixture: Fixture = {
    testUserId: userData.user.id,
    testUserEmail,
    testUserPassword,
    fundingId: funding.id,
    fundingToken,
    giftId: gift.id,
  }
  writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2))
  return fixture
}

export async function cleanup(): Promise<void> {
  let fixture: Fixture
  try {
    fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'))
  } catch {
    return
  }

  const supabase = adminClient()
  await supabase.from('payments').delete().eq('funding_id', fixture.fundingId)
  await supabase.from('gifts').delete().eq('funding_id', fixture.fundingId)
  await supabase.from('fundings').delete().eq('id', fixture.fundingId)
  await supabase.auth.admin.deleteUser(fixture.testUserId)
}

export function readFixture(): Fixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'))
}
