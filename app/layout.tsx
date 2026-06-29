import type { Metadata } from 'next'
import KakaoInit from '@/components/KakaoInit'
import './globals.css'

export const metadata: Metadata = {
  title: '모아모아 — 생일선물 펀딩',
  description: '소중한 사람의 생일을 함께 준비하세요',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
        <KakaoInit />
      </body>
    </html>
  )
}
