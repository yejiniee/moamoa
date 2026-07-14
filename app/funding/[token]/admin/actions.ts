'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

type ActionResult = { success: true } | { error: string }

// 마감(close): 진행중(active) 펀딩을 종료한다. 더 이상 선물을 받지 않는다.
export async function closeFunding(fundingId: string): Promise<ActionResult> {
  const serverClient = await createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const supabase = createServiceClient()

  const { data: funding } = await supabase
    .from('fundings')
    .select('creator_user_id, status, share_token')
    .eq('id', fundingId)
    .single()

  if (!funding || funding.creator_user_id !== user.id) return { error: '권한이 없습니다' }
  if (funding.status !== 'active') return { error: '이미 마감된 펀딩입니다' }

  const { error } = await supabase
    .from('fundings')
    .update({ status: 'closed' })
    .eq('id', fundingId)

  if (error) return { error: error.message }

  revalidatePath(`/funding/${funding.share_token}`)
  return { success: true as const }
}

type BankInfo = {
  bankName: string
  accountNumber: string
  accountHolder: string
}

// 정산(settle): 마감(closed)된 펀딩의 모인 금액을 인출한다. 계좌 정보와 정산 금액을 기록한다.
export async function settleFunding(fundingId: string, bank: BankInfo): Promise<ActionResult> {
  const serverClient = await createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const bankName = bank.bankName?.trim()
  const accountNumber = bank.accountNumber?.trim()
  const accountHolder = bank.accountHolder?.trim()
  if (!bankName || !accountNumber || !accountHolder) {
    return { error: '정산 계좌 정보를 모두 입력해주세요' }
  }

  const supabase = createServiceClient()

  const { data: funding } = await supabase
    .from('fundings')
    .select('creator_user_id, status, share_token')
    .eq('id', fundingId)
    .single()

  if (!funding || funding.creator_user_id !== user.id) return { error: '권한이 없습니다' }
  if (funding.status === 'settled') return { error: '이미 정산된 펀딩입니다' }
  if (funding.status !== 'closed') return { error: '마감된 펀딩만 정산할 수 있습니다' }

  // 확정(confirmed)된 결제 금액만 정산 대상
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('funding_id', fundingId)
    .eq('status', 'confirmed')

  const settledAmount = (payments ?? []).reduce((sum, p) => sum + p.amount, 0)

  const { error } = await supabase
    .from('fundings')
    .update({
      status: 'settled',
      settled_at: new Date().toISOString(),
      settled_amount: settledAmount,
      settle_bank_name: bankName,
      settle_account_number: accountNumber,
      settle_account_holder: accountHolder,
    })
    .eq('id', fundingId)

  if (error) return { error: error.message }

  revalidatePath(`/funding/${funding.share_token}`)
  return { success: true as const }
}

export async function deleteFunding(token: string): Promise<{ success: true } | { error: string }> {
  const serverClient = await createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const supabase = createServiceClient()

  const { data: funding } = await supabase
    .from('fundings')
    .select('id, creator_user_id, image_url')
    .eq('share_token', token)
    .single()

  if (!funding || funding.creator_user_id !== user.id) return { error: '권한이 없습니다' }

  if (funding.image_url) {
    const path = funding.image_url.split('/funding-images/')[1]
    if (path) await supabase.storage.from('funding-images').remove([path])
  }

  // 참조 테이블 먼저 삭제 (FK 제약)
  await supabase.from('payments').delete().eq('funding_id', funding.id)
  await supabase.from('gifts').delete().eq('funding_id', funding.id)

  const { error } = await supabase.from('fundings').delete().eq('id', funding.id)
  if (error) return { error: error.message }
  return { success: true as const }
}
