"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/ui/Header";
import DeleteModal from "@/components/funding/DeleteModal";
import SettleButton from "@/components/funding/SettleButton";
import { formatKRW } from "@/lib/utils";
import { deleteFunding } from "./actions";
import type { Funding, Payment } from "@/lib/supabase/types";

// TODO: 실제 데이터 연결 후 제거
const MOCK_PAYMENTS: Payment[] = [
  {
    id: "mock-1",
    funding_id: "",
    participant_name: "김지수",
    amount: 30000,
    message: "생일 축하해! 🎉",
    order_id: "mock-order-1",
    payment_key: null,
    status: "confirmed",
    created_at: "2025-06-28T10:00:00Z",
  },
  {
    id: "mock-2",
    funding_id: "",
    participant_name: "박민준",
    amount: 50000,
    message: "항상 건강하게 지내",
    order_id: "mock-order-2",
    payment_key: null,
    status: "confirmed",
    created_at: "2025-06-29T14:30:00Z",
  },
  {
    id: "mock-3",
    funding_id: "",
    participant_name: "이수아",
    amount: 20000,
    message: null,
    order_id: "mock-order-3",
    payment_key: null,
    status: "confirmed",
    created_at: "2025-06-30T09:15:00Z",
  },
];

type Props = {
  funding: Funding;
  payments: Payment[];
  totalAmount: number;
  goalReached: boolean;
};

export default function AdminClient({
  funding,
  payments,
  totalAmount,
  goalReached,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const displayPayments = payments.length > 0 ? payments : MOCK_PAYMENTS;
  const displayTotal =
    payments.length > 0
      ? totalAmount
      : MOCK_PAYMENTS.reduce((s, p) => s + p.amount, 0);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteFunding(funding.share_token);
      if ("error" in result) {
        alert(result.error);
        return;
      }
      router.push("/funding");
    });
  };

  return (
    <>
      <Header />
      <main className="px-4 py-6 flex flex-col gap-5 pb-10">
        <div>
          <p className="text-lg font-semibold text-gray-700">{funding.title}</p>
          {funding.description && (
            <p className="text-sm text-gray-400 mt-0.5">
              {funding.description}
            </p>
          )}
        </div>

        <div className="bg-rose-50 rounded-2xl p-5">
          <p className="text-sm text-gray-500 mb-1">총 모인 금액</p>
          <p className="text-3xl font-bold text-rose-500">
            {formatKRW(displayTotal)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {displayPayments.length}명 참여
          </p>
        </div>

        {/* 수정 / 삭제 */}
        <div className="flex gap-3">
          <Link
            href={`/funding/${funding.share_token}/edit`}
            className="flex-1"
          >
            <button className="w-full h-[52px] rounded-[14px] border border-gray-200 text-base font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              수정하기
            </button>
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={isPending}
            className="flex-1 h-[52px] rounded-[14px] border border-red-200 text-base font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            삭제하기
          </button>
        </div>

        {/* 펀딩 참여자 */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-700">
            펀딩 참여자{" "}
            <span className="text-gray-400 font-normal">
              {displayPayments.length}명
            </span>
          </h2>
          {displayPayments.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-50 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                  <span className="text-sm">🎁</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900">
                    {p.participant_name}
                  </p>
                  {p.message && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      &ldquo;{p.message}&rdquo;
                    </p>
                  )}
                </div>
              </div>
              <span className="text-sm font-bold text-rose-500 shrink-0">
                {formatKRW(p.amount)}
              </span>
            </div>
          ))}
        </div>

        <SettleButton
          fundingId={funding.id}
          goalReached={goalReached}
          defaultSettled={funding.status === "closed"}
          mode="settle"
        />
      </main>

      {showDeleteModal && (
        <DeleteModal
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isPending={isPending}
        />
      )}
    </>
  );
}
