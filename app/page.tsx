import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const features = [
  { emoji: "🔗", label: "링크 공유", desc: "카카오톡으로 간편 공유" },
  { emoji: "💳", label: "간편 결제", desc: "토스페이먼츠 연동" },
  { emoji: "🎁", label: "선물 전달", desc: "실시간 달성률 확인" },
];

export default async function LandingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-[390px] flex flex-col gap-10">
        {/* Hero */}
        <div className="text-center flex flex-col items-center gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-center">
              <Image
                src="/images/logo.svg"
                alt="모아모아"
                width={120}
                height={40}
                priority
              />
            </div>
            <p className="text-[16px] text-gray-500 leading-relaxed">
              소중한 사람의 생일 선물을
              <br />
              함께 준비해보세요
            </p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="flex flex-col gap-3">
          {features.map(({ emoji, label, desc }) => (
            <div
              key={label}
              className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="w-11 h-11 bg-rose-50 rounded-[14px] flex items-center justify-center text-[22px] shrink-0">
                {emoji}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-[#191F28]">
                  {label}
                </span>
                <span className="text-[13px] text-gray-400">{desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <Link href="/create" className="block">
            <Button size="xlarge">펀딩 만들기</Button>
          </Link>
          {user ? (
            <Link href="/funding" className="block">
              <Button size="xlarge" variant="weak">
                내 펀딩 보기
              </Button>
            </Link>
          ) : (
            <p className="text-center text-[13px] text-gray-400">
              이미 계정이 있으신가요?{" "}
              <Link
                href="/login"
                className="text-rose-500 font-semibold hover:underline"
              >
                로그인
              </Link>
            </p>
          )}
          <p className="text-center text-[13px] text-gray-400">
            이미 링크가 있다면 공유된 링크로 접속하세요
          </p>
        </div>
      </div>
    </main>
  );
}
