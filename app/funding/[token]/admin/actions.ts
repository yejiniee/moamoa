'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function requestSettlement(fundingId: string): Promise<{ success: true } | { error: string }> {
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
  if (funding.status === 'closed') return { error: '이미 정산된 펀딩입니다' }

  const { error } = await supabase
    .from('fundings')
    .update({ status: 'closed' })
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
