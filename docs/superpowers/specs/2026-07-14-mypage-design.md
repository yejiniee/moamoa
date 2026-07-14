# 마이페이지 설계

날짜: 2026-07-14
브랜치: `feature/mypage`

## 배경 / 목표

헤더의 로그아웃 버튼을 **마이페이지 진입점**으로 바꾸고, 마이페이지에서 다음을
할 수 있게 한다: **로그아웃, 계좌 등록/변경, 비밀번호 바꾸기.**

현재 상태:
- 인증은 Supabase(이메일 OTP 가입 + 비밀번호 로그인). 비밀번호 변경은
  `supabase.auth.updateUser({ password })`로 가능.
- 계좌 정보는 **정산 시점에 펀딩마다 직접 입력**되어 `fundings.settle_bank_*`에 저장됨.
  사용자 단위로 저장된 계좌는 없다.

## 결정된 범위

- 계좌: 사용자별 기본 계좌를 신규 `profiles` 테이블에 저장. 정산 시 자동 프리필.
- 비밀번호: **바꾸기만**(로그인된 세션으로 새 비밀번호 설정). '찾기'(재설정)는 이번 범위 제외.
- 로그아웃: 마이페이지로 이동. 히스토리 교체 동작 유지.
- 마이페이지 구조: 단일 `/mypage` 라우트에 섹션 3개(계좌 / 비밀번호 / 로그아웃).

## 비목표 (YAGNI)

- 비밀번호 찾기/재설정(이메일) 흐름 — 별도 작업
- 계좌 서브라우트 분리, 프로필 이미지/닉네임 등 추가 프로필 필드
- 정산 완료 후 입력 계좌를 profile로 역저장 (프리필만)

## 컴포넌트 설계

### 1. Header 변경 — `components/ui/Header.tsx`

`isLoggedIn`일 때 표시하던 **로그아웃 버튼을 "마이페이지" 링크(`/mypage`)로 교체.**
로그아웃 핸들러(`handleSignOut`, `useTransition`, `signOut` import)는 Header에서 제거하고
마이페이지로 이동한다.

- prop `hideLogout` → `hideMyPage`로 이름 정리(의미: 이 액션을 숨김).
  사용처인 `app/funding/[token]/page.tsx`도 함께 수정.
- 현재 작업 트리에 대기 중인 `window.location.replace('/')` 로그아웃 변경은
  이 설계에서 **마이페이지 로그아웃 버튼으로 이전**된다.

### 2. `/mypage` 라우트 — `app/mypage/page.tsx`

- 로그인 필수. 서버 컴포넌트에서 `supabase.auth.getUser()`로 확인, 없으면 `/login`으로 redirect.
- 서버에서 본인 `profiles` 행을 조회해 계좌 폼 초기값으로 전달.
- 렌더 섹션(클라이언트 컴포넌트로 분리):
  - `MyPageAccountForm` — 은행명/계좌번호/예금주 입력 → `updateBankAccount`
  - `MyPagePasswordForm` — 새 비밀번호(+확인) 입력 → `changePassword`
  - `MyPageLogoutButton` — `signOut()` 후 `window.location.replace('/')`
- 헤더는 HeaderGate가 공통 렌더(제외 경로 아님). backHref는 기본 `router.back()`.

### 3. `profiles` 테이블 — `supabase/migrations/0002_profiles.sql`

```sql
create table if not exists profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  bank_name      text,
  account_number text,
  account_holder text,
  updated_at     timestamptz not null default now()
);

alter table profiles enable row level security;

-- 본인 행만 접근
create policy "profiles_select_own" on profiles for select
  using (auth.uid() = user_id);
create policy "profiles_insert_own" on profiles for insert
  with check (auth.uid() = user_id);
create policy "profiles_update_own" on profiles for update
  using (auth.uid() = user_id);

grant select, insert, update on public.profiles to authenticated;
```

`lib/supabase/types.ts`에 `profiles` 타입 추가.

### 4. 서버 액션 — `app/mypage/actions.ts`

- `updateBankAccount(bank: { bankName; accountNumber; accountHolder }): ActionResult`
  - authed 클라이언트 사용(RLS로 본인 행만). `upsert({ user_id, ... })`.
  - 입력 trim/검증(빈 값 처리). 성공 시 `revalidatePath('/mypage')`.
- `changePassword(newPassword: string): ActionResult`
  - `supabase.auth.updateUser({ password: newPassword })`.
  - 최소 길이 등 기본 검증. 에러는 기존 `toFriendlyError` 패턴 참고해 친화적 메시지로.

`ActionResult = { success: true } | { error: string }` (기존 admin/actions와 동일 패턴).

### 5. 정산 프리필 — 기존 정산 흐름 연동

- `app/funding/[token]/admin/page.tsx`(서버)에서 본인 `profiles` 계좌를 조회.
- `SettleButton`에 `defaultBank?: { bankName; accountNumber; accountHolder }` prop 추가.
  모달 입력 state 초기값으로 사용(사용자가 수정 가능).
- 정산 로직(`settleFunding`) 자체는 변경 없음 — 계좌 소스만 프리필.

## 데이터 흐름

- 계좌 저장: 폼 → `updateBankAccount` → RLS로 본인 `profiles` upsert.
- 정산: admin 서버 페이지가 `profiles` 계좌 조회 → `SettleButton` 프리필 → 기존 `settleFunding`.
- 비번 변경: 폼 → `changePassword` → Supabase auth 업데이트.
- 로그아웃: 버튼 → `signOut` → `window.location.replace('/')`.

## 인증/보호

- `middleware.ts`의 `isProtected`에 `/mypage` 추가(비로그인 접근 시 `/login` 리다이렉트).
- 마이페이지 서버 컴포넌트에서도 유저 재확인(방어적).

## 에러 처리

- 액션은 `{ error }` 반환, 폼이 인라인 메시지로 표시(기존 로그인/정산 폼 패턴).
- 비밀번호: 길이 미달/불일치는 클라이언트 선검증, 서버 실패는 친화적 메시지.

## 검증

- **`profiles` 마이그레이션은 Supabase SQL Editor에서 직접 실행**해야 함(기존 SQL 파일과 동일 운영 방식).
- `next build` 통과.
- 수동: 로그인 → 헤더 '마이페이지' 링크 → 계좌 저장/재조회 → 비번 변경 후 재로그인 →
  로그아웃 시 메인 이동 + 뒤로가기로 보호 페이지 복귀 불가 → 정산 모달 계좌 프리필 확인.
