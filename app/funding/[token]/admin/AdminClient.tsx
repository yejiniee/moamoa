'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Header from '@/components/ui/Header'
import { formatKRW } from '@/lib/utils'
import { requestSettlement } from './actions'
import type { Funding, Payment } from '@/lib/supabase/types'
import { signOut } from '@/app/login/actions'

type Props = {
  funding: Funding
  payments: Payment[]
  totalAmount: number
}

export default function AdminClient({ funding, payments, totalAmount }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [settled, setSettled] = useState(funding.status === 'closed')
  const [error, setError] = useState('')

  const handleSettle = () => {
    setError('')
    startTransition(async () => {
      const result = await requestSettlement(funding.id)
      if ('error' in result) return setError(result.error)
      setSettled(true)
    })
  }

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
      router.push('/')
    })
  }

  return (
    <>
      <Header
        right={
          <button
            className="text-sm text-gray-400 hover:underline"
            onClick={handleSignOut}
            disabled={isPending}
          >
            로그아웃
          </button>
        }
      />
      <main className="px-4 py-6 flex flex-col gap-5 pb-10">

        <div>
          <p className="text-lg font-semibold text-gray-700">{funding.title}</p>
          {funding.description && (
            <p className="text-sm text-gray-400 mt-0.5">{funding.description}</p>
          )}
        </div>

        <div className="bg-rose-50 rounded-2xl p-5">
          <p className="text-sm text-gray-500 mb-1">총 모인 금액</p>
          <p className="text-3xl font-bold text-rose-500">{formatKRW(totalAmount)}</p>
          <p className="text-xs text-gray-400 mt-1">{payments.length}명 참여</p>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-700">결제 내역</h2>
          {payments.length === 0 && (
            <div className="bg-white rounded-2xl p-4 text-center text-sm text-gray-400">
              아직 결제 내역이 없어요
            </div>
          )}
          {payments.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-start"
            >
              <div>
                <p className="font-semibold text-sm text-gray-900">{p.participant_name}</p>
                {p.message && <p className="text-xs text-gray-400 mt-0.5">&ldquo;{p.message}&rdquo;</p>}
                <p className="text-xs text-gray-300 mt-0.5">
                  {new Date(p.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <span className="text-sm font-semibold text-rose-500 ml-2">{formatKRW(p.amount)}</span>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {settled ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-700 text-sm font-semibold">
            정산이 완료되었습니다
          </div>
        ) : (
          <Button onClick={handleSettle} disabled={isPending}>
            {isPending ? '정산 중...' : '정산 요청하기'}
          </Button>
        )}
      </main>
    </>
  )
}
