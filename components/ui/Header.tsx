'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Props = {
  backHref?: string
  right?: React.ReactNode
}

export default function Header({ backHref, right }: Props) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="px-4 h-14 flex items-center justify-between">
        {backHref ? (
          <Link href={backHref} className="text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeft />
          </Link>
        ) : (
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft />
          </button>
        )}

        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 text-sm font-bold text-rose-500 tracking-tight hover:text-rose-600 transition-colors"
        >
          🎂 모아모아
        </Link>

        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
    </header>
  )
}

function ChevronLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
