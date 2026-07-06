import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FundingRealtime from "./FundingRealtime";
import Button from "@/components/ui/Button";
import Header from "@/components/ui/Header";
import SettleButton from "@/components/funding/SettleButton";

function calcDday(endDate: string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diffDays = Math.ceil(
    (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "마감";
  if (diffDays === 0) return "D-day";
  return `D-${diffDays}`;
}

export default async function FundingPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = await createClient();

  const [
    { data: funding },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("fundings")
      .select("*")
      .eq("share_token", params.token)
      .single(),
    supabase.auth.getUser(),
  ]);

  if (!funding) notFound();

  const isOwner = !!user && user.id === funding.creator_user_id;

  const [{ data: gifts }, { data: payments }] = await Promise.all([
    supabase
      .from("gifts")
      .select("*")
      .eq("funding_id", funding.id)
      .order("created_at"),
    supabase
      .from("payments")
      .select("*")
      .eq("funding_id", funding.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false }),
  ]);

  const dday = calcDday(funding.end_date);
  const isClosed = funding.status === "closed";
  const totalTarget = (gifts ?? []).reduce(
    (sum, g) => sum + g.target_amount,
    0,
  );
  const totalPaid = (payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const goalReached = totalTarget > 0 && totalPaid >= totalTarget;

  return (
    <>
      <Header
        backHref="/funding"
        right={
          <>
            {isOwner && (
              <Link
                href={`/funding/${params.token}/admin`}
                className="text-xs font-medium text-gray-500 hover:text-rose-500 bg-gray-100 hover:bg-rose-50 px-3 py-1 rounded-full transition-colors"
              >
                관리
              </Link>
            )}
          </>
        }
      />

      <main className="max-w-md mx-auto">
        {/* TDS Paragraph — 제목 영역 */}
        <div className="px-5 pt-6 pb-4">
          {isClosed ? (
            <span className="inline-block text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full mb-3">
              종료
            </span>
          ) : (
            <span className="inline-block text-xs font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full mb-3">
              {dday}
            </span>
          )}
          <h1 className="text-[22px] font-bold text-[#191F28] leading-snug">
            {funding.title}
          </h1>
          {funding.description && (
            <p className="mt-2 text-[14px] text-gray-500 leading-relaxed">
              {funding.description}
            </p>
          )}
        </div>

        {/* 이미지 + 달성률 / 후원자 롤링 */}
        <div className="px-5 pt-2">
          <FundingRealtime
            fundingId={funding.id}
            imageUrl={funding.image_url}
            title={funding.title}
            gifts={gifts ?? []}
            initialPayments={payments ?? []}
          />
        </div>
      </main>

      <div className="max-w-md mx-auto px-5 py-6">
        {isOwner ? (
          <SettleButton
            fundingId={funding.id}
            goalReached={goalReached}
            defaultSettled={isClosed}
          />
        ) : isClosed ? (
          <div className="h-[56px] flex items-center justify-center rounded-[14px] bg-gray-100 text-gray-400 text-[17px] font-semibold">
            마감된 펀딩이에요
          </div>
        ) : (
          <Link href={`/funding/${params.token}/pay`}>
            <Button>선물하기 🎁</Button>
          </Link>
        )}
      </div>
    </>
  );
}
