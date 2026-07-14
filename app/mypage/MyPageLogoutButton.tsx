'use client'

import { useTransition } from 'react'
import { signOut } from '@/app/login/actions'

export default function MyPageLogoutButton() {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await signOut()
      // 실제 보호는 미들웨어가 한다: signOut으로 세션 쿠키가 삭제됐으므로
      // 뒤로가기로 보호 페이지에 접근해도 /login으로 리다이렉트된다.
      // replace + 전체 새로고침은 현재('/mypage') 항목을 '/'로 바꾸고 클라이언트 상태를 비우는 보조 역할.
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
