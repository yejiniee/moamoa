# Header 레이아웃 리팩터링 설계

날짜: 2026-07-14
브랜치: `refactor/header-layout`

## 배경 / 문제

`components/ui/Header.tsx`가 메인 페이지를 제외한 9개 페이지에 각각 import되어
개별적으로 `<Header .../>`를 렌더한다. 중복이 많아 유지보수성이 떨어지고,
페이지 전환마다 Header가 재마운트되면서 `supabase.auth.getUser()` 인증 체크를
매번 다시 돌린다(로그아웃 버튼 깜빡임 가능).

### 현재 사용 현황

| 경로 | 파일 | 현재 형태 |
|---|---|---|
| `/` | `app/page.tsx` | 헤더 없음 (자체 로고) |
| `/create` | `app/create/page.tsx` | `backHref="/"` |
| `/login` | `app/login/page.tsx` | `backHref="/"` |
| `/funding` | `app/funding/page.tsx` | `backHref="/"` |
| `/register` | `app/register/page.tsx` | `backHref="/login"` |
| `/payment/success` | `app/payment/success/page.tsx` | `<Header />` (기본 back) |
| `/payment/fail` | `app/payment/fail/page.tsx` | `<Header />` (기본 back) |
| `/funding/[token]/edit` | `EditClient.tsx` | `<Header />` (기본 back) |
| `/funding/[token]/admin` | `AdminClient.tsx` | `<Header />` (기본 back) |
| `/funding/[token]/pay` | `PayClient.tsx` | `<Header />` (기본 back) |
| `/funding/[token]` | `app/funding/[token]/page.tsx` | **특수**: `backHref="/funding"` + `hideLogout` + `right`(관리 버튼) |

## 목표

- 9개 페이지의 `import`/`<Header>` 중복 제거
- 현재 네비게이션 동작(backHref 포함) 100% 보존
- 레이아웃 persist로 페이지 전환 시 Header 재마운트/인증 재요청 제거
- Header 컴포넌트(`components/ui/Header.tsx`) 자체는 수정하지 않음

## 비목표 (YAGNI)

- Header UI/스타일 변경 없음
- `/funding/[token]` 상세의 특수 Header는 예외로 유지 (아래 참고)
- 관련 없는 리팩터링 없음

## 설계: 루트 레이아웃 + HeaderGate

### 핵심 결정

`/funding/[token]` 상세 페이지의 `right`(관리 버튼)는 서버에서 온 `isOwner`
데이터에 의존하므로 중앙화할 수 없다. **이 페이지만 자기 Header를 직접 렌더하는
예외로 남긴다.** 나머지 9개는 레이아웃이 공통 렌더한다.

### 컴포넌트: `components/ui/HeaderGate.tsx` (신규, 클라이언트)

`usePathname()`으로 현재 경로를 읽어 Header 렌더 여부와 `backHref`를 결정한다.

책임:
1. 렌더 제외: `pathname === '/'` (메인), 그리고 `/funding/[token]` 상세 정확히 일치
   (정규식 `/^\/funding\/[^/]+$/` — `/funding` 목록과 `/funding/x/edit` 등 하위는 제외 안 됨)
2. 그 외 경로는 `<Header backHref={...} />` 렌더
3. `backHref` 매핑(단일 소스):
   ```ts
   const BACK_HREF: Record<string, string> = {
     '/create': '/',
     '/login': '/',
     '/funding': '/',
     '/register': '/login',
   }
   // 매핑에 없으면 undefined → Header 기본 router.back() 동작
   ```

의존성: `usePathname` (next/navigation), 기존 `Header` 컴포넌트.
입력: 없음(경로 기반). 출력: Header 또는 null.

### `app/layout.tsx` 변경

기존 래퍼 `<div>` 안, `{children}` **위**에 `<HeaderGate />`를 추가:

```tsx
<div className="min-h-screen w-full bg-[var(--color-bg)] sm:max-w-[430px] sm:mx-auto">
  <HeaderGate />
  {children}
</div>
```

Header는 `sticky top-0`이므로 렌더 순서가 현재와 동일하게 유지되어 시각적 결과는 같다.

### 페이지 변경

다음 9개 파일에서 `Header` import와 `<Header .../>` JSX 제거:
- `app/create/page.tsx`
- `app/login/page.tsx`
- `app/funding/page.tsx`
- `app/register/page.tsx`
- `app/payment/success/page.tsx`
- `app/payment/fail/page.tsx`
- `app/funding/[token]/edit/EditClient.tsx`
- `app/funding/[token]/admin/AdminClient.tsx`
- `app/funding/[token]/pay/PayClient.tsx`

**변경 안 함**:
- `app/page.tsx` (원래 헤더 없음)
- `app/funding/[token]/page.tsx` (특수 Header 직접 렌더 유지)

## 데이터 흐름

라우팅 → `HeaderGate`가 `usePathname()`으로 경로 판독 → 매핑/정규식으로
렌더 여부·backHref 결정 → `Header` 렌더. 인증 상태는 `Header` 내부의 기존
`supabase.auth` 로직 그대로. 레이아웃이 persist되므로 전환 간 재마운트 없음.

## 엣지 케이스

- `/funding` (목록) vs `/funding/[token]` (상세): 정규식이 세그먼트 수로 구분
- `/funding/[token]/edit|admin|pay`: 하위 세그먼트라 예외 정규식에 안 걸림 → 공통 Header(기본 back)
- 알 수 없는/신규 경로: 매핑에 없으면 기본 `router.back()`으로 안전하게 동작

## 검증

- `npm run build` (또는 lint/typecheck) 통과
- 수동 확인: 메인은 헤더 없음, 상세는 관리 버튼 유지, 나머지 페이지 뒤로가기 목적지가
  변경 전과 동일, 페이지 전환 시 로그아웃 버튼 깜빡임 없음
