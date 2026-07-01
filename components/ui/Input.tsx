type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode
  error?: string
  hint?: string
}

export default function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const inputId = id ?? (typeof label === 'string' ? label : undefined)

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[14px] font-medium text-gray-600">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'h-[56px] w-full rounded-[12px] border bg-white px-4',
          'text-[15px] text-[#191F28] placeholder:text-gray-400',
          'outline-none transition-colors duration-100',
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100'
            : 'border-[#E8EAED] focus:border-rose-400 focus:ring-2 focus:ring-rose-100',
          className,
        ].join(' ')}
        {...props}
      />
      {hint && !error && (
        <p className="text-[13px] text-gray-400">{hint}</p>
      )}
      {error && (
        <p className="text-[13px] text-red-500">{error}</p>
      )}
    </div>
  )
}
