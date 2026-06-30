# MoaMoa 개발 프로세스

> 생일선물 펀딩 웹서비스 구현 현황판

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| Frontend | Next.js 14 (App Router) |
| DB / Auth / Realtime | Supabase |
| 결제 | 토스페이먼츠 (테스트 모드) |
| 카카오 알림 | 카카오 공유 SDK |
| 스타일 | Tailwind CSS |
| 언어 | TypeScript |
| 테스트 | Vitest |

## 디자인 시스템

UI는 **Toss Design System (TDS)** 을 참고한다.
메인 컬러는 rose로 유지하되, 컴포넌트 구조·간격·타이포그래피는 TDS 가이드를 따른다.

- 공식 문서: https://tossmini-docs.toss.im/tds-mobile/
- Pretendard Variable 폰트 사용
- 주요 컴포넌트: Button (fill/weak), Card, ListRow, Top, BottomCTA, Paragraph

---

## 구현 태스크

### Phase 1 — 프로젝트 기반

- [ ] **Task 1: 프로젝트 설정 & 의존성 설치**
  - `npx create-next-app@latest` (TypeScript, Tailwind, App Router)
  - 추가 패키지: `@supabase/supabase-js`, `@supabase/ssr`, `nanoid`, `@tosspayments/payment-sdk`
  - 테스트 환경: `vitest`, `@vitejs/plugin-react`
  - `.env.example` 작성

- [ ] **Task 2: 데이터베이스 스키마 & TypeScript 타입**
  - `lib/supabase/types.ts` — `Funding`, `Gift`, `Payment`, `Database` 타입
  - `supabase/schema.sql` — 3개 테이블 + RLS 정책 (사용자가 Supabase에서 직접 실행)

- [ ] **Task 3: 유틸리티 함수 & Supabase 클라이언트**
  - `lib/utils.ts` — `generateShareToken()`, `formatKRW()`, `calcPercent()`
  - `lib/utils.test.ts` — Vitest 유닛 테스트 (TDD)
  - `lib/supabase/client.ts` — 브라우저 클라이언트
  - `lib/supabase/server.ts` — 서버 anon / service_role 클라이언트

---

### Phase 2 — UI & 랜딩

- [ ] **Task 4: UI 공통 컴포넌트 & 랜딩 페이지**
  - `components/ui/Button.tsx`
  - `components/ui/Input.tsx`
  - `components/ui/ProgressBar.tsx`
  - `app/layout.tsx` (Kakao SDK Script 포함)
  - `app/page.tsx` — 랜딩 페이지 (🎂 모아모아 + "펀딩 만들기" 버튼)

---

### Phase 2.5 — 인증 (Auth) ← 신규 추가

> **배경:** 펀딩 생성마다 OTP 인증 요구 → 이메일+비밀번호 회원가입/로그인으로 전환. 세션 유지로 재인증 불필요. 카카오 소셜 로그인은 추후 구현.

- [ ] **Task A: DB 스키마 마이그레이션 & 타입 업데이트**
  - `fundings.creator_email` → `fundings.creator_user_id uuid REFERENCES auth.users(id)` 변경
  - RLS 정책 추가: `fundings` update → `auth.uid() = creator_user_id`
  - Supabase 대시보드 SQL Editor에서 직접 실행
  - `lib/supabase/types.ts` `Funding` 타입: `creator_email: string` → `creator_user_id: string`

- [ ] **Task B: 미들웨어 (세션 보호)**
  - `middleware.ts` — `/create`, `/funding/[token]/admin` 경로 세션 확인
  - 세션 없으면 `/login?redirect=원래경로` 리다이렉트
  - Supabase `@supabase/ssr` 쿠키 갱신 처리

- [ ] **Task C: 회원가입 페이지**
  - `app/register/page.tsx` — 이메일, 비밀번호, 비밀번호 확인 입력
  - `app/register/actions.ts` — `signUp(email, password)`, `verifySignUpOtp(email, otp)`
  - Step 1: 이메일 + 비밀번호 입력 → OTP 발송
  - Step 2: OTP 코드 입력 → 계정 생성 + 자동 로그인 → /create 리다이렉트
  - TDS 스타일 적용

- [ ] **Task D: 로그인 페이지**
  - `app/login/page.tsx` — 이메일 + 비밀번호 입력
  - `app/login/actions.ts` — `signIn(email, password)`, `signOut()`
  - 로그인 성공 → `redirect` 파라미터 경로 또는 `/create`
  - 로그아웃 버튼 (헤더 또는 어드민 페이지 내)
  - TDS 스타일 적용

- [ ] **Task E: 카카오 소셜 로그인 (추후 구현 — 우선순위 낮음)**
  - Supabase OAuth Provider: Kakao 설정
  - `app/login/page.tsx`에 "카카오로 로그인" 버튼 추가
  - 환경변수: Supabase 대시보드에서 Kakao Client ID/Secret 등록

---

### Phase 3 — 펀딩 생성 (수정)

- [ ] **Task 5: 펀딩 생성 Server Action 수정**
  - `app/create/actions.ts`
  - `sendOtp` / `verifyOtp` 제거
  - `createFunding(data)` — `creator_user_id = session.user.id` 사용 (creator_email 파라미터 제거)

- [ ] **Task 6: 펀딩 생성 페이지 수정 (1단계 UI)**
  - `app/create/page.tsx` — 클라이언트 컴포넌트
  - Step 1~2 (이메일 OTP) 제거 → 바로 펀딩 정보 입력
  - 펀딩 제목 / 설명 / 마감일 / 선물 목록 입력
  - 완료: 공유 링크 표시 + 복사 버튼

---

### Phase 4 — 공개 펀딩 페이지

- [x] **Task 7: 공개 펀딩 페이지 — 정적 표시**
  - `components/funding/FundingProgress.tsx` — 달성률 바 + 금액
  - `components/funding/GiftList.tsx` — 선물 목록 + 각 달성률
  - `components/funding/DonorList.tsx` — 후원자 목록
  - `app/funding/[token]/page.tsx` — Server Component (초기 데이터 fetch)

- [x] **Task 8: Realtime 실시간 업데이트**
  - `app/funding/[token]/FundingRealtime.tsx` — Client Component
  - Supabase Realtime `payments` 테이블 구독
  - 결제 완료 시 달성률 / 금액 / 후원자 목록 자동 갱신

---

### Phase 5 — 결제

- [ ] **Task 9: 결제 입력 페이지 & createPendingPayment**
  - `components/payment/AmountSelector.tsx` — 빠른 선택(1만/2만/3만/5만) + 자유 입력
  - `app/funding/[token]/pay/page.tsx` — Server Component (funding_id 조회)
  - `app/funding/[token]/pay/PayClient.tsx` — Client Component (결제창 호출)
  - `app/funding/[token]/pay/actions.ts` — `createPendingPayment()`

- [ ] **Task 10: 결제 확인 API Route & 성공/실패 페이지**
  - `app/api/payment/confirm/route.ts` — 토스페이먼츠 서버 검증 + DB 업데이트
  - `app/payment/success/page.tsx` — Server Component (orderId로 결제 조회)
  - `app/payment/success/SuccessClient.tsx` — `/api/payment/confirm` 호출 + 결과 표시
  - `app/payment/fail/page.tsx`

- [ ] **Task 11: 카카오 공유**
  - `types/kakao.d.ts` — `window.Kakao` 전역 타입 선언
  - 결제 성공 후 "카카오톡으로 알리기" 팝업 (SuccessClient에 포함)

---

### Phase 6 — 주최자 관리 (수정)

- [ ] **Task 12: 주최자 관리 페이지 & 정산**
  - `app/funding/[token]/admin/page.tsx` — Server Component (세션 기반 접근 제어)
  - `app/funding/[token]/admin/actions.ts`
  - OTP 재인증 제거 → 세션 `user.id === fundings.creator_user_id` 검증으로 대체
  - `requestSettlement(token)` — fundings.status = 'closed' 업데이트
  - 로그아웃 버튼 포함

---

## 환경변수 체크리스트

`.env.local`에 모두 입력 필요:

| 변수 | 출처 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 토스페이먼츠 개발자센터 (test_ck_...) |
| `TOSS_SECRET_KEY` | 토스페이먼츠 개발자센터 (test_sk_...) |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 카카오 developers.kakao.com |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` |

---

## Supabase 수동 설정 항목

코드로 자동화할 수 없는 항목 (사용자가 직접):

1. **SQL 실행** — `supabase/schema.sql` 내용을 Supabase SQL Editor에서 실행
2. **DB 마이그레이션** — `creator_email` → `creator_user_id` 컬럼 변경 (Task A SQL)
3. **Realtime 활성화** — Database → Replication → `payments` 테이블 토글 ON
4. **Auth 설정** — Authentication → Email Provider → "Enable Email Confirmations" 체크 (OTP 회원가입 인증용)
5. **카카오 도메인 등록** — Kakao Developers → 앱 설정 → 플랫폼 → Web → `http://localhost:3000`
6. **[추후] 카카오 OAuth** — Supabase → Authentication → Providers → Kakao → Client ID/Secret 등록

---

## 파일 구조 (완성 시)

```
moamoa/
├── middleware.ts                     # 세션 보호 (신규)
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      # 랜딩
│   ├── register/
│   │   ├── page.tsx                  # 회원가입 (신규)
│   │   └── actions.ts
│   ├── login/
│   │   ├── page.tsx                  # 로그인 (신규)
│   │   └── actions.ts
│   ├── create/
│   │   ├── page.tsx                  # 펀딩 생성 (OTP 단계 제거)
│   │   └── actions.ts
│   ├── funding/[token]/
│   │   ├── page.tsx                  # 공개 펀딩 페이지
│   │   ├── FundingRealtime.tsx
│   │   ├── pay/
│   │   │   ├── page.tsx
│   │   │   ├── PayClient.tsx
│   │   │   └── actions.ts
│   │   └── admin/
│   │       ├── page.tsx              # 세션 기반 접근 제어
│   │       └── actions.ts
│   ├── payment/
│   │   ├── success/
│   │   │   ├── page.tsx
│   │   │   └── SuccessClient.tsx
│   │   └── fail/page.tsx
│   └── api/payment/confirm/route.ts
├── components/
│   ├── ui/ (Button, Input, ProgressBar)
│   ├── funding/ (FundingProgress, GiftList, DonorList)
│   └── payment/ (AmountSelector, KakaoShareModal)
├── lib/
│   ├── utils.ts
│   ├── utils.test.ts
│   └── supabase/ (client.ts, server.ts, types.ts)
├── supabase/schema.sql
├── types/kakao.d.ts
└── PROCESS.md
```
