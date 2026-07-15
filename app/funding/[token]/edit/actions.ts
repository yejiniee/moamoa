'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

type GiftInput = { id: string; name: string; targetAmount: number; description: string }

export async function updateFunding(
  token: string,
  data: {
    title: string
    description: string
    endDate: string
    imageUrl: string | null
    gift: GiftInput
  }
): Promise<{ success: true } | { error: string }> {
  const serverClient = await createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const supabase = createServiceClient()

  const { data: funding } = await supabase
    .from('fundings')
    .select('id, creator_user_id')
    .eq('share_token', token)
    .single()

  if (!funding || funding.creator_user_id !== user.id) return { error: '권한이 없습니다' }

  const { error: fundingError } = await supabase
    .from('fundings')
    .update({
      title: data.title,
      description: data.description,
      end_date: new Date(data.endDate).toISOString(),
      image_url: data.imageUrl,
    })
    .eq('id', funding.id)

  if (fundingError) return { error: fundingError.message }

  // 이 gift가 실제로 이 펀딩 소속인지까지 검증한다(IDOR 방지).
  // service_role은 RLS를 우회하므로 id만으로 수정하면 타인 펀딩의 gift도
  // 바뀔 수 있어, funding_id 조건을 함께 걸어 범위를 제한한다.
  const { error: giftError } = await supabase
    .from('gifts')
    .update({
      name: data.gift.name,
      target_amount: data.gift.targetAmount,
      description: data.gift.description,
    })
    .eq('id', data.gift.id)
    .eq('funding_id', funding.id)

  if (giftError) return { error: giftError.message }

  revalidatePath(`/funding/${token}`)
  revalidatePath(`/funding/${token}/admin`)
  return { success: true as const }
}
