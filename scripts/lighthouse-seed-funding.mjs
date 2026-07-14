// Lighthouse CI가 측정하는 /funding/{token}/{pay,admin,edit}는 펀딩이
// status: 'active'이고 로그인한 LHCI 테스트 계정이 소유주여야만 200을 반환한다.
// 다른 e2e/QA 시나리오가 같은 샘플 펀딩을 마감/정산 처리하면 이 전제가 깨져
// LHCI collect가 통째로 실패한다. 매 실행 전에 이 스크립트로 상태를 강제 초기화한다.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const token = process.env.SAMPLE_FUNDING_TOKEN || 'sample'
const ownerEmail = process.env.LHCI_TEST_EMAIL

if (!url || !key || !ownerEmail) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LHCI_TEST_EMAIL 환경변수가 모두 필요합니다.'
  )
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

async function findOwnerId() {
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`LHCI 테스트 계정 조회 실패: ${error.message}`)
    const found = data.users.find((u) => u.email === ownerEmail)
    if (found) return found.id
    if (data.users.length < 200) break
    page += 1
  }
  throw new Error(
    `LHCI_TEST_EMAIL(${ownerEmail})에 해당하는 Supabase 계정을 찾지 못했습니다. 미리 가입되어 있어야 합니다.`
  )
}

async function main() {
  const ownerId = await findOwnerId()
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: existing } = await supabase
    .from('fundings')
    .select('id')
    .eq('share_token', token)
    .maybeSingle()

  let fundingId
  if (existing) {
    const { error } = await supabase
      .from('fundings')
      .update({
        status: 'active',
        creator_user_id: ownerId,
        end_date: endDate,
        settled_at: null,
        settled_amount: null,
        settle_bank_name: null,
        settle_account_number: null,
        settle_account_holder: null,
      })
      .eq('id', existing.id)
    if (error) throw new Error(`샘플 펀딩 초기화 실패: ${error.message}`)
    fundingId = existing.id
    console.log(`[lighthouse-seed] 기존 샘플 펀딩(${token})을 active로 리셋했습니다.`)
  } else {
    const { data: created, error } = await supabase
      .from('fundings')
      .insert({
        creator_user_id: ownerId,
        title: '[Lighthouse] 샘플 펀딩',
        description: 'Lighthouse CI 측정 전용으로 자동 생성/유지되는 펀딩입니다',
        end_date: endDate,
        share_token: token,
        status: 'active',
      })
      .select('id')
      .single()
    if (error || !created) throw new Error(`샘플 펀딩 생성 실패: ${error?.message}`)
    fundingId = created.id
    console.log(`[lighthouse-seed] 샘플 펀딩(${token})을 새로 생성했습니다.`)
  }

  const { data: gifts, error: giftsError } = await supabase
    .from('gifts')
    .select('id')
    .eq('funding_id', fundingId)
  if (giftsError) throw new Error(`샘플 펀딩 선물 목록 조회 실패: ${giftsError.message}`)

  if (!gifts || gifts.length === 0) {
    const { error } = await supabase
      .from('gifts')
      .insert({ funding_id: fundingId, name: '샘플 선물', target_amount: 100_000 })
    if (error) throw new Error(`샘플 펀딩 선물 생성 실패: ${error.message}`)
    console.log('[lighthouse-seed] 선물이 없어 기본 선물을 추가했습니다.')
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
