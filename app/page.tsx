import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <div className="text-[80px] leading-none mb-6">🎂</div>
          <h1 className="text-[28px] font-bold text-gray-900 mb-3 leading-tight">모아모아</h1>
          <p className="text-base text-gray-500 leading-relaxed">
            소중한 사람의 생일 선물을
            <br />
            함께 준비해보세요
          </p>
        </div>

        <Link href="/create" className="block">
          <Button>펀딩 만들기</Button>
        </Link>

        <div className="mt-12 grid grid-cols-3 gap-4">
          {[
            { emoji: '🔗', label: '링크 공유' },
            { emoji: '💳', label: '간편 결제' },
            { emoji: '🎁', label: '선물 전달' },
          ].map(({ emoji, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl">
                {emoji}
              </div>
              <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
