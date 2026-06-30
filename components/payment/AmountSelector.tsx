'use client'

const QUICK_AMOUNTS = [10000, 20000, 30000, 50000]

type Props = { value: number; onChange: (v: number) => void }

export default function AmountSelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-gray-700">금액 선택</label>
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            className={`py-2 rounded-2xl text-sm font-semibold border transition-colors ${
              value === a
                ? 'bg-rose-500 text-white border-rose-500'
                : 'border-gray-300 text-gray-700 hover:border-rose-300'
            }`}
          >
            {(a / 10000).toFixed(0)}만원
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="flex-1 border border-gray-300 rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
          placeholder="직접 입력 (최소 1,000원)"
          min={1000}
          value={value || ''}
          onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        />
        <span className="text-sm text-gray-500">원</span>
      </div>
    </div>
  )
}
