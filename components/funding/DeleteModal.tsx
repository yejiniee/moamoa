'use client'

type Props = {
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

export default function DeleteModal({ onConfirm, onCancel, isPending }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">펀딩을 삭제할까요?</p>
          <p className="text-sm text-gray-500 mt-1">삭제하면 되돌릴 수 없어요</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 h-[52px] rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-[52px] rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-40"
          >
            {isPending ? '삭제 중...' : '삭제하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
