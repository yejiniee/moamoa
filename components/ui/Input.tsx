type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

export default function Input({ label, error, hint, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        className={`h-[52px] border-[1.5px] rounded-xl px-4 text-sm text-gray-900 placeholder:text-gray-400
          outline-none transition-colors
          focus:border-rose-400 focus:ring-2 focus:ring-rose-100
          ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-gray-200'}
          ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
