'use client'

import { useId, useState } from 'react'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode
  error?: React.ReactNode
  hint?: string
}

export default function Input({ label, error, hint, className = '', id, type, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const isDate = type === 'date'
  const showDatePlaceholder = isDate && !props.value

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[14px] font-medium text-gray-600">
          {label}
        </label>
      )}
      <div className="relative min-w-0">
        <input
          id={inputId}
          type={isPassword ? (visible ? 'text' : 'password') : type}
          className={[
            'peer h-[56px] w-full min-w-0 max-w-full rounded-[12px] border bg-white px-4',
            isPassword ? 'pr-12' : '',
            'text-left text-[16px] text-[#191F28] placeholder:text-gray-400',
            'outline-none transition-colors duration-100',
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
              : 'border-[#E8EAED] focus:border-rose-400 focus:ring-2 focus:ring-rose-100',
            className,
          ].join(' ')}
          {...props}
        />
        {showDatePlaceholder && (
          <div className="pointer-events-none absolute inset-0 hidden items-center rounded-[12px] border border-[#E8EAED] bg-white px-4 text-[16px] text-gray-400 supports-[-webkit-touch-callout:none]:flex peer-focus:opacity-0">
            연도-월-일
          </div>
        )}
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-gray-400 transition-colors duration-100 hover:text-gray-600 active:text-gray-800"
            aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
          >
            {visible ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </button>
        )}
      </div>
      {hint && !error && (
        <p className="text-[13px] text-gray-400">{hint}</p>
      )}
      {error && (
        <p className="text-[13px] text-red-500">{error}</p>
      )}
    </div>
  )
}
