'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { requestSettlement } from '@/app/funding/[token]/admin/actions'

type Props = {
  fundingId: string
  goalReached: boolean
  defaultSettled: boolean
  mode?: 'close' | 'settle'
}

export default function SettleButton({ fundingId, goalReached, defaultSettled, mode = 'close' }: Props) {
  const label = mode === 'settle' ? '정산하기' : '마감하기'
  const actionLabel = mode === 'settle' ? '정산' : '마감'
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [settled, setSettled] = useState(defaultSettled)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  if (settled) {
    return (
      <button
        disabled
        className="w-full h-[56px] rounded-[14px] bg-gray-100 text-gray-400 text-[17px] font-semibold cursor-not-allowed"
      >
        마감
      </button>
    )
  }

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await requestSettlement(fundingId)
      if ('error' in result) {
        setError(result.error)
        setShowModal(false)
        return
      }
      setSettled(true)
      setShowModal(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button onClick={() => setShowModal(true)}>{label}</Button>
      {error && <p className="text-sm text-red-500 mt-1 text-center">{error}</p>}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
            <div className="text-center">
              {goalReached ? (
                <>
                  <p className="text-3xl mb-2">🎉</p>
                  <p className="text-lg font-bold text-gray-900">목표금액을 달성했어요!</p>
                  <p className="text-sm text-gray-500 mt-1">지금 {actionLabel}을 진행할까요?</p>
                </>
              ) : (
                <>
                  <p className="text-3xl mb-2">😢</p>
                  <p className="text-lg font-bold text-gray-900">아직 목표금액에 도달하지 못했어요</p>
                  <p className="text-sm text-gray-500 mt-1">그래도 {actionLabel}을 진행할까요?</p>
                </>
              )}
            </div>
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
                {isPending ? `${actionLabel} 중...` : label}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
