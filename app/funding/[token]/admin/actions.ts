'use server'

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function requestSettlement(fundingId: string): Promise<{ success: true } | { error: string }> {
  const serverClient = await createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const supabase = createServiceClient()

  const { data: funding } = await supabase
    .from('fundings')
    .select('creator_user_id, status')
    .eq('id', fundingId)
    .single()

  if (!funding || funding.creator_user_id !== user.id) return { error: '권한이 없습니다' }
  if (funding.status === 'closed') return { error: '이미 정산된 펀딩입니다' }

  const { error } = await supabase
    .from('fundings')
    .update({ status: 'closed' })
    .eq('id', fundingId)

  if (error) return { error: error.message }
  return { success: true as const }
}
