'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Input from '@/components/ui/Input'
import Header from '@/components/ui/Header'
import { uploadFundingImage } from '@/app/create/actions'
import { updateFunding } from './actions'
import type { Funding, Gift } from '@/lib/supabase/types'

type Props = {
  token: string
  funding: Funding
  gift: Gift
}

export default function EditClient({ token, funding, gift }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState(funding.title)
  const [description, setDescription] = useState(funding.description ?? '')
  const [endDate, setEndDate] = useState(funding.end_date.split('T')[0])
  const [imageUrl, setImageUrl] = useState<string | null>(funding.image_url)
  const [imagePreview, setImagePreview] = useState<string | null>(funding.image_url)
  const [imageUploading, setImageUploading] = useState(false)

  const [giftName, setGiftName] = useState(gift.name)
  const [giftTargetAmount, setGiftTargetAmount] = useState(String(gift.target_amount))
  const [giftDescription, setGiftDescription] = useState(gift.description ?? '')

  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
    setImageUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadFundingImage(formData)
    setImageUploading(false)
    if ('error' in result) {
      setError(result.error)
      setImagePreview(funding.image_url)
    } else {
      setImageUrl(result.url)
    }
  }

  const handleSave = () => {
    if (!title) return setError('펀딩 제목을 입력해주세요')
    if (!endDate) return setError('마감일을 선택해주세요')
    if (!giftName || !giftTargetAmount) return setError('선물 정보를 모두 입력해주세요')
    if (imageUploading) return setError('이미지 업로드 중입니다')
    setError('')

    startTransition(async () => {
      const result = await updateFunding(token, {
        title,
        description,
        endDate,
        imageUrl,
        gift: {
          id: gift.id,
          name: giftName,
          targetAmount: parseInt(giftTargetAmount.replace(/,/g, ''), 10),
          description: giftDescription,
        },
      })
      if ('error' in result) return setError(result.error)
      router.push(`/funding/${token}/admin`)
    })
  }

  return (
    <>
      <Header backHref={`/funding/${token}/admin`} />
      <main className="px-4 py-6">
        <h1 className="text-xl font-bold mb-6">펀딩 수정하기</h1>
        <div className="flex flex-col gap-5">

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">대표 이미지</label>
            <div
              className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-rose-300 transition-colors"
              style={{ height: 160 }}
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <Image src={imagePreview} alt="미리보기" fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <span className="text-2xl">📷</span>
                  <span className="text-xs">클릭해서 이미지 변경</span>
                </div>
              )}
              {imageUploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <span className="text-sm text-gray-500">업로드 중...</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>

          <Input label="펀딩 제목" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">설명 (선택)</label>
            <textarea
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Input
            label="마감일"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />

          <Input label="선물 이름" value={giftName} onChange={(e) => setGiftName(e.target.value)} />
          <Input
            label="목표 금액 (원)"
            type="number"
            value={giftTargetAmount}
            onChange={(e) => setGiftTargetAmount(e.target.value)}
            min={1000}
          />
          <Input
            label="선물 설명 (선택)"
            value={giftDescription}
            onChange={(e) => setGiftDescription(e.target.value)}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/funding/${token}/admin`)}
              disabled={isPending}
              className="flex-1 h-[56px] rounded-[14px] border border-gray-200 text-[17px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || imageUploading}
              className="flex-1 h-[56px] rounded-[14px] bg-rose-500 text-white text-[17px] font-semibold hover:bg-rose-600 transition-colors disabled:opacity-40"
            >
              {isPending ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
