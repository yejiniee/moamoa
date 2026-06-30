'use client'

import { useState, useTransition } from 'react'
import { loadTossPayments } from '@tosspayments/payment-sdk'
import AmountSelector from '@/components/payment/AmountSelector'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createPendingPayment } from './actions'

type Props = { fundingId: string; fundingTitle: string }

export default function PayClient({ fundingId, fundingTitle }: Props) {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState(0)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handlePay = () => {
    if (!amount || amount < 1000) return setError('최소 1,000원부터 결제 가능해요')
    if (!name.trim()) return setError('이름을 입력해주세요')
    setError('')

    startTransition(async () => {
      const result = await createPendingPayment(fundingId, name, message, amount)
      if ('error' in result) return setError(result.error)

      try {
        const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
        await tossPayments.requestPayment('카드', {
          amount,
          orderId: result.orderId,
          orderName: `${fundingTitle} 펀딩 참여`,
          successUrl: `${window.location.origin}/payment/success`,
          failUrl: `${window.location.origin}/payment/fail`,
          customerName: name,
        })
      } catch (e: unknown) {
        if (e instanceof Error && e.message !== 'User canceled payment.') {
          setError('결제 중 오류가 발생했습니다')
        }
      }
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-5">
        <h1 className="text-xl font-bold text-gray-900">선물하기 🎁</h1>

        <AmountSelector value={amount} onChange={setAmount} />

        <Input
          label="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">응원 메시지 (선택)</label>
          <textarea
            className="border border-gray-300 rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300 resize-none"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="생일 축하해! 🎂"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button onClick={handlePay} disabled={isPending}>
          {isPending ? '처리 중...' : '결제하기'}
        </Button>
      </div>
    </main>
  )
}
