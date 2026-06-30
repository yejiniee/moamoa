'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { signIn } from './actions'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/create'

  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = () => {
    if (!email) return setError('이메일을 입력해주세요')
    if (!password) return setError('비밀번호를 입력해주세요')
    setError('')

    startTransition(async () => {
      const result = await signIn(email, password)
      if ('error' in result) return setError(result.error)
      router.push(redirectTo)
      router.refresh()
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm flex flex-col gap-5">
        <div className="text-center mb-2">
          <div className="text-4xl mb-2">🎂</div>
          <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
          <p className="text-sm text-gray-500 mt-1">모아모아에 오신 걸 환영해요</p>
        </div>

        <Input
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <Input
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 입력"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          error={error}
        />

        <Button onClick={handleLogin} disabled={isPending}>
          {isPending ? '로그인 중...' : '로그인'}
        </Button>

        <p className="text-center text-sm text-gray-400">
          아직 계정이 없으신가요?{' '}
          <Link href="/register" className="text-rose-500 font-semibold hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  )
}
