'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Header from '@/components/ui/Header'
import { sendSignUpOtp, verifyOtpAndSetPassword } from './actions'

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/

export default function RegisterPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [otp, setOtp] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSendFailed, setEmailSendFailed] = useState(false)
  const [showFailModal, setShowFailModal] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [error, setError] = useState('')

  const handleSendOtp = () => {
    setEmailError('')
    setEmailSendFailed(false)
    setPasswordError('')
    setError('')
    if (!email) return setEmailError('이메일을 입력해주세요')
    if (!PASSWORD_PATTERN.test(password)) {
      return setPasswordError('영문, 숫자, 특수문자를 모두 포함해주세요')
    }
    if (password !== passwordConfirm) return setError('비밀번호가 일치하지 않아요')

    startTransition(async () => {
      const result = await sendSignUpOtp(email)
      if ('error' in result) {
        if (result.code === 'EMAIL_SEND_FAILED') return setEmailSendFailed(true)
        return setEmailError(result.error)
      }
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
    <>
      <Header backHref="/login" />
      <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md flex flex-col gap-5">
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
              error={
                emailSendFailed ? (
                  <>
                    이메일 전송에 실패했어요.{' '}
                    <button
                      type="button"
                      onClick={() => setShowFailModal(true)}
                      className="underline font-medium"
                    >
                      자세히보기
                    </button>
                  </>
                ) : (
                  emailError
                )
              }
            />
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="영문, 숫자, 특수문자 포함 6자 이상"
              error={passwordError}
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
              onClick={() => { setStep(1); setError(''); setEmailError(''); setEmailSendFailed(false); setPasswordError('') }}
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

      {showFailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">지금은 회원가입이 어려워요</p>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                아래 테스트 계정으로 로그인해서 이용해주세요.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">아이디</span>
                <span className="font-semibold text-gray-900">yjcho0011@gmail.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">비밀번호</span>
                <span className="font-semibold text-gray-900">qwer1234!</span>
              </div>
            </div>
            <Link
              href="/login"
              className="h-[52px] rounded-xl bg-rose-500 text-white text-sm font-semibold flex items-center justify-center"
            >
              로그인하러 가기
            </Link>
            <button
              onClick={() => setShowFailModal(false)}
              className="text-sm text-gray-400"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
