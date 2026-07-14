'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'

// 경로별 강제 뒤로가기 목적지. 없으면 Header 기본 router.back() 사용.
const BACK_HREF: Record<string, string> = {
  '/create': '/',
  '/login': '/',
  '/funding': '/',
  '/register': '/login',
}

// 헤더를 렌더하지 않는 경로:
// - '/' 메인(자체 로고)
// - '/funding/[token]' 상세(관리 버튼이 서버 데이터에 의존해 페이지가 직접 렌더)
function isExcluded(pathname: string) {
  if (pathname === '/') return true
  return /^\/funding\/[^/]+$/.test(pathname)
}

export default function HeaderGate() {
  const pathname = usePathname()
  if (isExcluded(pathname)) return null
  return <Header backHref={BACK_HREF[pathname]} />
}
