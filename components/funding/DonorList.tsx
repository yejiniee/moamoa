import type { Payment } from '@/lib/supabase/types'
import { formatKRW } from '@/lib/utils'

type Props = {
  payments: Payment[]
}

export default function DonorList({ payments }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">
        후원자{' '}
        <span className="text-rose-500">{payments.length}</span>명
      </h2>
      <div className="space-y-2">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
          >
            <div className="shrink-0 w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-sm font-semibold text-rose-600">
              {payment.participant_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <span className="font-medium text-gray-900">{payment.participant_name}</span>
                <span className="text-sm text-rose-500 font-semibold ml-2 shrink-0">
                  {formatKRW(payment.amount)}
                </span>
              </div>
              {payment.message && (
                <p className="text-sm text-gray-600 mt-0.5">{payment.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
