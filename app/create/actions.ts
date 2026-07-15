'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { generateShareToken } from '@/lib/utils'

export async function uploadFundingImage(formData: FormData): Promise<{ url: string } | { error: string }> {
  const file = formData.get('file') as File | null
  if (!file) return { error: '파일을 선택해주세요' }
  if (!file.type.startsWith('image/')) return { error: '이미지 파일만 업로드 가능해요' }
  if (file.size > 5 * 1024 * 1024) return { error: '5MB 이하 파일을 넣어주세요' }

  const serverClient = await createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const supabase = createServiceClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('funding-images')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('funding-images').getPublicUrl(path)
  return { url: publicUrl }
}

type GiftInput = { name: string; targetAmount: number; description: string }

export async function createFunding(data: {
  title: string
  description: string
  imageUrl: string | null
  endDate: string
  gifts: GiftInput[]
}): Promise<{ shareToken: string } | { error: string }> {
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
      image_url: data.imageUrl,
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

  // 생성 직후 상세 → 뒤로가기로 목록에 왔을 때 새 펀딩이 바로 보이도록
  // 내 펀딩 리스트 캐시를 무효화한다. (deleteFunding과 동일한 이유)
  revalidatePath('/funding')

  return { shareToken }
}
