'use server'

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { generateShareToken } from '@/lib/utils'

type GiftInput = { name: string; targetAmount: number; description: string }

export async function createFunding(data: {
  title: string
  description: string
  endDate: string
  gifts: GiftInput[]
}) {
  if (data.gifts.length === 0) return { error: '선물을 1개 이상 추가해주세요' }

  const serverClient = await createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const supabase = createServiceClient()
  const shareToken = generateShareToken()

  const { data: funding, error: fundingError } = await supabase
    .from('fundings')
    .insert({
      creator_user_id: user.id,
      title: data.title,
      description: data.description,
      end_date: new Date(data.endDate).toISOString(),
      share_token: shareToken,
      status: 'active',
    })
    .select()
    .single()

  if (fundingError) return { error: fundingError.message }

  const { error: giftsError } = await supabase.from('gifts').insert(
    data.gifts.map((g) => ({
      funding_id: funding.id,
      name: g.name,
      target_amount: g.targetAmount,
      description: g.description,
    }))
  )

  if (giftsError) return { error: giftsError.message }

  return { shareToken }
}
