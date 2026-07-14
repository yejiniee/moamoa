'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateBankAccount } from './actions'

type Props = {
  initial: { bankName: string; accountNumber: string; accountHolder: string }
}

const inputCls =
  'h-[52px] rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-rose-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-default'

export default function MyPageAccountForm({ initial }: Props) {
  const router = useRouter()
  // 저장된 계좌가 하나라도 있으면 '등록됨'으로 본다.
  const hasAccount = !!(
    initial.bankName ||
    initial.accountNumber ||
    initial.accountHolder
  )
  const [editing, setEditing] = useState(false)
  const [bankName, setBankName] = useState(initial.bankName)
  const [accountNumber, setAccountNumber] = useState(initial.accountNumber)
  const [accountHolder, setAccountHolder] = useState(initial.accountHolder)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  const startEdit = () => {
    setError('')
    setDone(false)
    setEditing(true)
  }

  // 취소: 입력값을 저장된 값으로 되돌리고 조회 모드로 복귀
  const handleCancel = () => {
    setBankName(initial.bankName)
    setAccountNumber(initial.accountNumber)
    setAccountHolder(initial.accountHolder)
    setError('')
    setEditing(false)
  }

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
      setEditing(false)
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
        disabled={!editing}
      />
      <input
        type="text"
        inputMode="numeric"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        placeholder="계좌번호 ('-' 없이 숫자만)"
        className={inputCls}
        disabled={!editing}
      />
      <input
        type="text"
        value={accountHolder}
        onChange={(e) => setAccountHolder(e.target.value)}
        placeholder="예금주"
        className={inputCls}
        disabled={!editing}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {done && <p className="text-sm text-emerald-600">계좌가 저장되었어요 ✅</p>}

      {editing ? (
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="flex-1 h-[52px] rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 transition-all duration-100 hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 h-[52px] rounded-xl bg-rose-500 text-white text-sm font-semibold transition-all duration-100 hover:bg-rose-600 active:bg-rose-700 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="h-[52px] rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 transition-all duration-100 hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98]"
        >
          {hasAccount ? '수정하기' : '등록하기'}
        </button>
      )}
    </div>
  )
}
