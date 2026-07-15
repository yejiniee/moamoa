"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DeleteModal from "@/components/funding/DeleteModal";
import SettleButton from "@/components/funding/SettleButton";
import { formatKRW } from "@/lib/utils";
import { deleteFunding } from "./actions";
import type { Funding, Payment } from "@/lib/supabase/types";

type Props = {
  funding: Funding;
  payments: Payment[];
  totalAmount: number;
  defaultBank?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  settledBank?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
};

export default function AdminClient({
  funding,
  payments,
  totalAmount,
  defaultBank,
  settledBank,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
            {formatKRW(totalAmount)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {payments.length}명 참여
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
              {payments.length}명
            </span>
          </h2>
          {payments.map((p) => (
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
          status={funding.status}
          totalAmount={totalAmount}
          defaultBank={defaultBank}
          settledInfo={{
            settledAmount: funding.settled_amount,
            bankName: settledBank?.bankName ?? null,
            accountNumber: settledBank?.accountNumber ?? null,
            accountHolder: settledBank?.accountHolder ?? null,
            settledAt: funding.settled_at,
          }}
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
