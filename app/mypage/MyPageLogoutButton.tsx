'use client'

import { useTransition } from 'react'
import { signOut } from '@/app/login/actions'

export default function MyPageLogoutButton() {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await signOut()
      // 현재 히스토리 항목을 '/'로 교체하며 전체 새로고침한다.
      // 세션 쿠키는 signOut으로 삭제됐고, 뒤로가기로 보호 페이지에 접근해도 미들웨어가 막는다.
      window.location.replace('/')
    })
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="h-[52px] w-full rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40"
    >
      {isPending ? '로그아웃 중...' : '로그아웃'}
    </button>
  )
}
