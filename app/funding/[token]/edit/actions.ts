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

  const { error: giftError } = await supabase
    .from('gifts')
    .update({
      name: data.gift.name,
      target_amount: data.gift.targetAmount,
      description: data.gift.description,
    })
    .eq('id', data.gift.id)

  if (giftError) return { error: giftError.message }

  revalidatePath(`/funding/${token}`)
  revalidatePath(`/funding/${token}/admin`)
  return { success: true as const }
}
