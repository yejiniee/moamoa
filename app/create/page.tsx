'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { sendOtp, verifyOtp, createFunding } from './actions'

type Step = 'email' | 'otp' | 'form' | 'done'

type GiftItem = {
  id: string
  name: string
  targetAmount: string
  description: string
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={[
              'w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold',
              n < current
                ? 'bg-rose-500 text-white'
                : n === current
                ? 'bg-rose-500 text-white ring-4 ring-rose-100'
                : 'bg-gray-100 text-gray-400',
            ].join(' ')}
          >
            {n < current ? '✓' : n}
          </div>
          {n < 3 && (
            <div className={`w-10 h-0.5 ${n < current ? 'bg-rose-400' : 'bg-gray-100'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function CreatePage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [endDate, setEndDate] = useState('')
  const [gifts, setGifts] = useState<GiftItem[]>([
    { id: crypto.randomUUID(), name: '', targetAmount: '', description: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shareToken, setShareToken] = useState('')
  const [copied, setCopied] = useState(false)

  const stepNumber = step === 'email' ? 1 : step === 'otp' ? 2 : 3

  async function handleSendOtp() {
    if (!email) return
    setLoading(true)
    setError('')
    const res = await sendOtp(email)
    setLoading(false)
    if ('error' in res) {
      setError(res.error)
    } else {
      setStep('otp')
    }
  }

  async function handleVerifyOtp() {
    if (!otp) return
    setLoading(true)
    setError('')
    const res = await verifyOtp(email, otp)
    setLoading(false)
    if ('error' in res) {
      setError(res.error)
    } else {
      setStep('form')
    }
  }

  function addGift() {
    setGifts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', targetAmount: '', description: '' },
    ])
  }

  function removeGift(id: string) {
    setGifts((prev) => prev.filter((g) => g.id !== id))
  }

  function updateGift(id: string, field: keyof Omit<GiftItem, 'id'>, value: string) {
    setGifts((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)))
  }

  async function handleCreateFunding() {
    setError('')
    if (!title) { setError('펀딩 제목을 입력해주세요'); return }
    if (!endDate) { setError('마감일을 선택해주세요'); return }
    if (gifts.some((g) => !g.name || !g.targetAmount)) {
      setError('선물 이름과 목표 금액을 모두 입력해주세요')
      return
    }

    setLoading(true)
    const res = await createFunding({
      email,
      title,
      description,
      endDate,
      gifts: gifts.map((g) => ({
        name: g.name,
        targetAmount: Number(g.targetAmount.replace(/,/g, '')),
        description: g.description,
      })),
    })
    setLoading(false)

    if ('error' in res) {
      setError(res.error)
    } else {
      setShareToken(res.shareToken)
      setStep('done')
    }
  }

  async function handleCopy() {
    const url = `${window.location.origin}/funding/${shareToken}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/funding/${shareToken}`
    : ''

  return (
    <main className="min-h-screen flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-[390px] flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-[12px] flex items-center justify-center text-[22px]">
              🎁
            </div>
            <h1 className="text-[20px] font-bold text-[#191F28]">펀딩 만들기</h1>
          </div>
          {step !== 'done' && <StepIndicator current={stepNumber} />}
        </div>

        {/* Step 1: 이메일 입력 */}
        {step === 'email' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[18px] font-bold text-[#191F28]">이메일을 입력해주세요</h2>
              <p className="text-[14px] text-gray-500">인증 코드를 발송해 드릴게요</p>
            </div>
            <Input
              label="이메일"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
              error={error}
              autoFocus
            />
            <Button onClick={handleSendOtp} disabled={!email || loading}>
              {loading ? '발송 중...' : '인증 코드 받기'}
            </Button>
          </div>
        )}

        {/* Step 2: OTP 입력 */}
        {step === 'otp' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[18px] font-bold text-[#191F28]">인증 코드를 입력해주세요</h2>
              <p className="text-[14px] text-gray-500">
                <span className="text-rose-500 font-medium">{email}</span>로 발송된 6자리 코드
              </p>
            </div>
            <Input
              label="인증 코드"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
              error={error}
              autoFocus
            />
            <div className="flex flex-col gap-3">
              <Button onClick={handleVerifyOtp} disabled={otp.length !== 6 || loading}>
                {loading ? '확인 중...' : '인증하기'}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
              >
                이메일 다시 입력
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: 펀딩 정보 입력 */}
        {step === 'form' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[18px] font-bold text-[#191F28]">펀딩 정보를 입력해주세요</h2>
              <p className="text-[14px] text-gray-500">선물 받을 분의 펀딩을 만들어보세요</p>
            </div>

            {/* 기본 정보 */}
            <div className="flex flex-col gap-4">
              <Input
                label="펀딩 제목"
                placeholder="예) 지수의 생일 선물 펀딩 🎂"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-medium text-gray-600">설명 (선택)</label>
                <textarea
                  className="w-full rounded-[12px] border border-[#E8EAED] bg-white px-4 py-3 text-[15px] text-[#191F28] placeholder:text-gray-400 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-colors resize-none"
                  rows={3}
                  placeholder="펀딩에 대한 간단한 설명을 적어주세요"
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
            </div>

            {/* 선물 목록 */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold text-[#191F28]">선물 목록</span>
                <button
                  onClick={addGift}
                  className="text-[13px] font-medium text-rose-500 hover:text-rose-600"
                >
                  + 선물 추가
                </button>
              </div>

              {gifts.map((gift, idx) => (
                <div
                  key={gift.id}
                  className="flex flex-col gap-3 bg-gray-50 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-gray-500">선물 {idx + 1}</span>
                    {gifts.length > 1 && (
                      <button
                        onClick={() => removeGift(gift.id)}
                        className="text-[13px] text-gray-400 hover:text-red-500"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <Input
                    placeholder="선물 이름 (예: 에어팟 프로)"
                    value={gift.name}
                    onChange={(e) => updateGift(gift.id, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="목표 금액 (원)"
                    inputMode="numeric"
                    value={gift.targetAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      updateGift(gift.id, 'targetAmount', raw ? Number(raw).toLocaleString() : '')
                    }}
                  />
                  <Input
                    placeholder="설명 (선택)"
                    value={gift.description}
                    onChange={(e) => updateGift(gift.id, 'description', e.target.value)}
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-[13px] text-red-500">{error}</p>}

            <Button onClick={handleCreateFunding} disabled={loading}>
              {loading ? '생성 중...' : '펀딩 만들기'}
            </Button>
          </div>
        )}

        {/* Done: 공유 링크 */}
        {step === 'done' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 bg-rose-50 rounded-[20px] flex items-center justify-center text-[36px]">
                🎉
              </div>
              <div className="text-center flex flex-col gap-1">
                <h2 className="text-[20px] font-bold text-[#191F28]">펀딩이 만들어졌어요!</h2>
                <p className="text-[14px] text-gray-500">링크를 복사해서 친구들에게 공유해보세요</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 rounded-[12px] px-4 py-3 flex items-center gap-2">
                <span className="text-[13px] text-gray-500 truncate flex-1">{shareUrl}</span>
              </div>
              <Button onClick={handleCopy}>
                {copied ? '✓ 복사됨' : '링크 복사하기'}
              </Button>
              <Button
                variant="weak"
                onClick={() => window.open(`/funding/${shareToken}`, '_blank')}
              >
                펀딩 페이지 보기
              </Button>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
