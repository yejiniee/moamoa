'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateShareToken } from '@/lib/utils'

export async function sendOtp(email: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function verifyOtp(email: string, otp: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'email',
  })
  if (error) return { error: 'OTP가 올바르지 않거나 만료되었습니다' }
  return { success: true }
}

type GiftInput = {
  name: string
  targetAmount: number
  description: string
}

type CreateFundingInput = {
  email: string
  title: string
  description: string
  endDate: string
  gifts: GiftInput[]
}

export async function createFunding(
  data: CreateFundingInput
): Promise<{ shareToken: string } | { error: string }> {
  if (data.gifts.length === 0) return { error: '선물을 1개 이상 추가해주세요' }

  const supabase = createServiceClient()
  const shareToken = generateShareToken()

  const { data: funding, error: fundingError } = await supabase
    .from('fundings')
    .insert({
      creator_email: data.email,
      title: data.title,
      description: data.description || null,
      end_date: new Date(data.endDate).toISOString(),
      share_token: shareToken,
      status: 'active' as const,
    })
    .select('id')
    .single()

  if (fundingError || !funding) {
    return { error: fundingError?.message ?? '펀딩 생성에 실패했습니다' }
  }

  const { error: giftsError } = await supabase.from('gifts').insert(
    data.gifts.map((g) => ({
      funding_id: funding.id,
      name: g.name,
      target_amount: g.targetAmount,
      description: g.description || null,
    }))
  )

  if (giftsError) return { error: giftsError.message }

  return { shareToken }
}
