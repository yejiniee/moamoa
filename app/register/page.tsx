'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { sendSignUpOtp, verifyOtpAndSetPassword } from './actions'

export default function RegisterPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')

  const handleSendOtp = () => {
    if (!email) return setError('이메일을 입력해주세요')
    if (password.length < 6) return setError('비밀번호는 6자 이상이어야 해요')
    if (password !== passwordConfirm) return setError('비밀번호가 일치하지 않아요')
    setError('')

    startTransition(async () => {
      const result = await sendSignUpOtp(email)
      if ('error' in result) return setError(result.error)
      setStep(2)
    })
  }

  const handleVerify = () => {
    if (!otp) return setError('인증 코드를 입력해주세요')
    setError('')

    startTransition(async () => {
      const result = await verifyOtpAndSetPassword(email, otp, password)
      if ('error' in result) return setError(result.error)
      router.push('/login')
      router.refresh()
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm flex flex-col gap-5">
        <div className="text-center mb-2">
          <div className="text-4xl mb-2">🎂</div>
          <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 1 ? '이메일과 비밀번호를 입력해주세요' : `${email}로 인증 코드를 보냈어요`}
          </p>
        </div>

        <div className="flex gap-2 mb-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${step >= s ? 'bg-rose-400' : 'bg-gray-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <Input
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
            />
            <Input
              label="비밀번호 확인"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 재입력"
              error={error}
            />
            <Button onClick={handleSendOtp} disabled={isPending}>
              {isPending ? '처리 중...' : '인증 코드 받기'}
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <Input
              label="인증 코드 (6자리)"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              maxLength={6}
              error={error}
            />
            <Button onClick={handleVerify} disabled={isPending}>
              {isPending ? '확인 중...' : '가입 완료'}
            </Button>
            <button
              className="text-sm text-gray-400 hover:underline"
              onClick={() => { setStep(1); setError('') }}
            >
              이메일 다시 입력
            </button>
          </>
        )}

        <p className="text-center text-sm text-gray-400">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-rose-500 font-semibold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  )
}
