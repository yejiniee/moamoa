'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateBankAccount } from './actions'

type Props = {
  initial: { bankName: string; accountNumber: string; accountHolder: string }
}

const inputCls =
  'h-[52px] rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-rose-400'

export default function MyPageAccountForm({ initial }: Props) {
  const router = useRouter()
  const [bankName, setBankName] = useState(initial.bankName)
  const [accountNumber, setAccountNumber] = useState(initial.accountNumber)
  const [accountHolder, setAccountHolder] = useState(initial.accountHolder)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    setError('')
    setDone(false)
    startTransition(async () => {
      const res = await updateBankAccount({ bankName, accountNumber, accountHolder })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setDone(true)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={bankName}
        onChange={(e) => setBankName(e.target.value)}
        placeholder="은행명 (예: 토스뱅크)"
        className={inputCls}
      />
      <input
        type="text"
        inputMode="numeric"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        placeholder="계좌번호 ('-' 없이 숫자만)"
        className={inputCls}
      />
      <input
        type="text"
        value={accountHolder}
        onChange={(e) => setAccountHolder(e.target.value)}
        placeholder="예금주"
        className={inputCls}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {done && <p className="text-sm text-emerald-600">계좌가 저장되었어요 ✅</p>}
      <button
        onClick={handleSave}
        disabled={isPending}
        className="h-[52px] rounded-xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-40"
      >
        {isPending ? '저장 중...' : '계좌 저장'}
      </button>
    </div>
  )
}
