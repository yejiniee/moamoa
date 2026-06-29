export default function ProgressBar({
  percent,
  className = '',
}: {
  percent: number
  className?: string
}) {
  return (
    <div className={`w-full bg-gray-100 rounded-full h-1.5 overflow-hidden ${className}`}>
      <div
        className="h-full bg-rose-400 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </div>
  )
}
