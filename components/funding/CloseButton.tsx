'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { closeFunding } from '@/app/funding/[token]/admin/actions'

type Props = {
  fundingId: string
  goalReached: boolean
}

// 마감하기: 진행중인 펀딩을 종료한다. (정산은 마감 후 관리 화면에서 진행)
export default function CloseButton({ fundingId, goalReached }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await closeFunding(fundingId)
      if ('error' in result) {
        setError(result.error)
        setShowModal(false)
        return
      }
      setShowModal(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button onClick={() => setShowModal(true)}>마감하기</Button>
      {error && <p className="text-sm text-red-500 mt-1 text-center">{error}</p>}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
            <div className="text-center">
              {goalReached ? (
                <>
                  <p className="text-3xl mb-2">🎉</p>
                  <p className="text-lg font-bold text-gray-900">목표금액을 달성했어요!</p>
                  <p className="text-sm text-gray-500 mt-1">지금 펀딩을 마감할까요?</p>
                </>
              ) : (
                <>
                  <p className="text-3xl mb-2">😢</p>
                  <p className="text-lg font-bold text-gray-900">아직 목표금액에 도달하지 못했어요</p>
                  <p className="text-sm text-gray-500 mt-1">그래도 마감할까요?</p>
                </>
              )}
              <p className="text-xs text-gray-400 mt-2">마감하면 더 이상 선물을 받을 수 없어요</p>
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
                {isPending ? '마감 중...' : '마감하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
