type ProgressBarProps = {
  percent: number
  size?: 'sm' | 'md'
  className?: string
}

export default function ProgressBar({ percent, size = 'sm', className = '' }: ProgressBarProps) {
  const clamped = Math.min(Math.max(percent, 0), 100)
  const heights = { sm: 'h-1.5', md: 'h-2' }

  return (
    <div className={`w-full rounded-full bg-gray-100 overflow-hidden ${heights[size]} ${className}`}>
      <div
        className="h-full rounded-full bg-rose-500"
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
