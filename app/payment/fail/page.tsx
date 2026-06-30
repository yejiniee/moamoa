'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function FailPage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="text-center w-full max-w-md bg-white rounded-2xl p-8 shadow-sm flex flex-col gap-4">
        <div className="text-5xl">😢</div>
        <h1 className="text-2xl font-bold text-gray-900">결제에 실패했어요</h1>
        <p className="text-sm text-gray-500">{message || '알 수 없는 오류가 발생했습니다'}</p>
        <button
          className="text-sm text-rose-500 hover:underline"
          onClick={() => window.history.back()}
        >
          다시 시도하기
        </button>
        <Link href="/">
          <Button variant="outline" size="large">홈으로 돌아가기</Button>
        </Link>
      </div>
    </main>
  )
}
