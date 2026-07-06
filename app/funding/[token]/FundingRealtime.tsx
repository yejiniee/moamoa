"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import FundingProgress from "@/components/funding/FundingProgress";
import DonorRolling from "@/components/funding/DonorRolling";
import type { Gift, Payment } from "@/lib/supabase/types";

type Props = {
  fundingId: string;
  imageUrl: string | null;
  title: string;
  gifts: Gift[];
  initialPayments: Payment[];
};

export default function FundingRealtime({
  fundingId,
  imageUrl,
  title,
  gifts,
  initialPayments,
}: Props) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);

  const totalGoal = gifts.reduce((sum, g) => sum + g.target_amount, 0);
  const totalRaised = payments.reduce((sum, p) => sum + p.amount, 0);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`payments:${fundingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `funding_id=eq.${fundingId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newPayment = payload.new as Payment;
            if (newPayment.status === "confirmed") {
              setPayments((prev) => [...prev, newPayment]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Payment;
            setPayments((prev) => {
              const exists = prev.some((p) => p.id === updated.id);
              if (updated.status === "confirmed") {
                if (exists)
                  return prev.map((p) => (p.id === updated.id ? updated : p));
                return [...prev, updated];
              }
              return prev.filter((p) => p.id !== updated.id);
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fundingId]);

  return (
    <>
      {/* 이미지 + DonorRolling 오버레이 */}
      <div className="relative w-full">
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <Image
                src="/images/ic-birthday-cake.svg"
                alt="기본 이미지"
                width={120}
                height={120}
                style={{ filter: "brightness(0) invert(78%)" }}
              />
            </div>
          )}
        </div>
        {payments.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              maxWidth: "calc(100% - 24px)",
            }}
          >
            <DonorRolling payments={payments} />
          </div>
        )}
      </div>

      <div className="mt-4">
        <FundingProgress totalRaised={totalRaised} totalGoal={totalGoal} />
      </div>
    </>
  );
}
