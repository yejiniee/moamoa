'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { settleFunding } from '@/app/funding/[token]/admin/actions'
import { formatKRW } from '@/lib/utils'
import type { FundingStatus } from '@/lib/supabase/types'

type Props = {
  fundingId: string
  status: FundingStatus
  totalAmount: number
  settledInfo?: {
    settledAmount: number | null
    bankName: string | null
    accountNumber: string | null
    accountHolder: string | null
    settledAt: string | null
  }
  defaultBank?: {
    bankName: string
    accountNumber: string
    accountHolder: string
  }
}

// 정산하기: 마감(closed)된 펀딩의 모인 금액을 인출(기록)한다.
// - active(진행중): 마감 전이라 비활성화
// - closed(마감):   계좌 정보를 입력해 정산 진행
// - settled(정산완료): 정산 내역 표시
export default function SettleButton({ fundingId, status, totalAmount, settledInfo, defaultBank }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [bankName, setBankName] = useState(defaultBank?.bankName ?? '')
  const [accountNumber, setAccountNumber] = useState(defaultBank?.accountNumber ?? '')
  const [accountHolder, setAccountHolder] = useState(defaultBank?.accountHolder ?? '')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // 정산 완료 — 내역 표시
  if (status === 'settled') {
    const at = settledInfo?.settledAt
      ? new Date(settledInfo.settledAt).toLocaleDateString('ko-KR')
      : null
    return (
      <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-sm font-semibold text-emerald-700">정산 완료 ✅</p>
        <p className="mt-1 text-2xl font-bold text-emerald-600">
          {formatKRW(settledInfo?.settledAmount ?? totalAmount)}
        </p>
        {settledInfo?.bankName && (
          <p className="mt-1 text-xs text-emerald-700/80">
            {settledInfo.bankName} {settledInfo.accountNumber} ({settledInfo.accountHolder})
          </p>
        )}
        {at && <p className="mt-0.5 text-xs text-gray-400">{at} 정산</p>}
      </div>
    )
  }

  // 진행중 — 마감 전이라 정산 불가
  if (status === 'active') {
    return (
      <div>
        <button
          disabled
          className="w-full h-[56px] rounded-[14px] bg-gray-100 text-gray-400 text-[17px] font-semibold cursor-not-allowed"
        >
          정산하기
        </button>
        <p className="mt-1.5 text-center text-xs text-gray-400">
          펀딩을 마감한 뒤에 정산할 수 있어요
        </p>
      </div>
    )
  }

  // 마감됨 — 정산 진행 가능
  const handleConfirm = () => {
    setError('')
    startTransition(async () => {
      const result = await settleFunding(fundingId, { bankName, accountNumber, accountHolder })
      if ('error' in result) {
        setError(result.error)
        return
      }
      setShowModal(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button onClick={() => setShowModal(true)}>정산하기</Button>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">정산 계좌를 입력해주세요</p>
              <p className="mt-1 text-sm text-gray-500">
                모인 금액 <span className="font-semibold text-rose-500">{formatKRW(totalAmount)}</span>을 정산해요
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="은행명 (예: 토스뱅크)"
                className="h-[52px] rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-rose-400"
              />
              <input
                type="text"
                inputMode="numeric"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="계좌번호 ('-' 없이 숫자만)"
                className="h-[52px] rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-rose-400"
              />
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="예금주"
                className="h-[52px] rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-rose-400"
              />
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isPending}
                className="flex-1 h-[52px] rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 h-[52px] rounded-xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-40"
              >
                {isPending ? '정산 중...' : '정산하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
