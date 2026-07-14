import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import KakaoInit from "@/components/KakaoInit";
import HeaderGate from "@/components/ui/HeaderGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "모아모아 — 생일선물 펀딩",
  description: "소중한 사람의 생일을 함께 준비하세요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased sm:bg-[#f2f3f5]">
        {/* 페이지 전환 시 상단 진행바: 기존 화면을 유지한 채 얇은 바만 표시.
            빠른 전환에선 거의 보이지 않고, 느릴 때만 로딩 중임을 알려준다. */}
        <NextTopLoader
          color="#f43f5e"
          height={3}
          shadow="0 0 10px #f43f5e,0 0 5px #f43f5e"
          showSpinner={false}
        />
        <div className="min-h-screen w-full bg-[var(--color-bg)] sm:max-w-[430px] sm:mx-auto">
          <HeaderGate />
          {children}
        </div>
        <KakaoInit />
      </body>
    </html>
  );
}
