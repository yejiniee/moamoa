'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { uploadFundingImage, createFunding } from './actions'

type GiftInput = { name: string; targetAmount: string; description: string }

export default function CreatePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [endDate, setEndDate] = useState('')
  const [gifts, setGifts] = useState<GiftInput[]>([{ name: '', targetAmount: '', description: '' }])
  const [error, setError] = useState('')
  const [shareToken, setShareToken] = useState('')

  // 이미지 업로드 상태
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
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
      setImagePreview(null)
    } else {
      setImageUrl(result.url)
    }
  }

  const addGift = () => setGifts([...gifts, { name: '', targetAmount: '', description: '' }])
  const removeGift = (idx: number) => setGifts(gifts.filter((_, i) => i !== idx))
  const updateGift = (idx: number, field: keyof GiftInput, value: string) => {
    setGifts(gifts.map((g, i) => (i === idx ? { ...g, [field]: value } : g)))
  }

  const handleCreateFunding = () => {
    if (!title) return setError('펀딩 제목을 입력해주세요')
    if (!endDate) return setError('마감일을 선택해주세요')
    if (gifts.some((g) => !g.name || !g.targetAmount)) return setError('선물 정보를 모두 입력해주세요')
    if (imageUploading) return setError('이미지 업로드 중입니다. 잠시 기다려주세요')
    setError('')

    startTransition(async () => {
      const result = await createFunding({
        title,
        description,
        imageUrl,
        endDate,
        gifts: gifts.map((g) => ({
          name: g.name,
          targetAmount: parseInt(g.targetAmount.replace(/,/g, ''), 10),
          description: g.description,
        })),
      })
      if ('error' in result) return setError(result.error)
      setShareToken(result.shareToken)
    })
  }

  if (shareToken) {
    const shareUrl = `${window.location.origin}/funding/${shareToken}`
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm text-center flex flex-col gap-4">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold">펀딩이 만들어졌어요!</h1>
          <p className="text-gray-500 text-sm">아래 링크를 참여자들에게 공유하세요</p>
          <div className="bg-gray-100 rounded-xl p-4 break-all text-sm text-gray-700">{shareUrl}</div>
          <Button onClick={() => navigator.clipboard.writeText(shareUrl)}>링크 복사하기</Button>
          <button
            className="mt-1 text-sm text-rose-500 hover:underline"
            onClick={() => router.push(`/funding/${shareToken}`)}
          >
            펀딩 페이지 보러가기 →
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold mb-6">펀딩 만들기 🎂</h1>
        <div className="flex flex-col gap-5">
          {/* 대표 이미지 업로드 */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">대표 이미지 (선택)</label>
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
                  <span className="text-xs">클릭해서 이미지 업로드</span>
                </div>
              )}
              {imageUploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <span className="text-sm text-gray-500">업로드 중...</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {imageUrl && (
              <p className="text-xs text-green-600">✓ 이미지 업로드 완료</p>
            )}
          </div>

          <Input
            label="펀딩 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="지수 생일 선물 펀딩 🎂"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">설명 (선택)</label>
            <textarea
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="펀딩 소개를 적어주세요"
            />
          </div>
          <Input
            label="마감일"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">선물 목록</span>
              <button className="text-xs text-rose-500 hover:underline" onClick={addGift}>
                + 선물 추가
              </button>
            </div>
            {gifts.map((gift, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-600">선물 {idx + 1}</span>
                  {gifts.length > 1 && (
                    <button className="text-xs text-gray-400 hover:text-red-400" onClick={() => removeGift(idx)}>
                      삭제
                    </button>
                  )}
                </div>
                <Input
                  label="선물 이름"
                  value={gift.name}
                  onChange={(e) => updateGift(idx, 'name', e.target.value)}
                  placeholder="에어팟 프로"
                />
                <Input
                  label="목표 금액 (원)"
                  type="number"
                  value={gift.targetAmount}
                  onChange={(e) => updateGift(idx, 'targetAmount', e.target.value)}
                  placeholder="350000"
                  min={1000}
                />
                <Input
                  label="설명 (선택)"
                  value={gift.description}
                  onChange={(e) => updateGift(idx, 'description', e.target.value)}
                  placeholder="2세대 에어팟 프로"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={handleCreateFunding} disabled={isPending || imageUploading}>
            {isPending ? '생성 중...' : '펀딩 만들기 🎂'}
          </Button>
        </div>
      </div>
    </main>
  )
}
