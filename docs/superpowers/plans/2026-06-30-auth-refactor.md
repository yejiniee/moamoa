# MoaMoa 인증 리팩토링 & 나머지 기능 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이메일+비밀번호 회원가입/로그인을 추가하고, 결제·카카오공유·어드민 기능을 구현한다.

**Architecture:** 미들웨어가 `/create`와 `/funding/[token]/admin` 경로를 세션으로 보호한다. `createFunding` Server Action은 `session.user.id`를 `creator_user_id`로 사용한다. 기존 create 페이지의 OTP 단계는 제거되고, 회원가입 시 1회만 OTP 인증한다. 어드민 접근은 세션 `user.id === funding.creator_user_id` 비교로만 처리한다.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (`@supabase/ssr`, Email+Password Auth), `@tosspayments/payment-sdk`, Kakao Share SDK, Tailwind CSS (Toss Design System 스타일)

## Global Constraints

- TypeScript strict mode
- 모든 UI 텍스트 한국어
- TDS 스타일: rose 컬러, `rounded-xl`, Pretendard 폰트, `shadow-sm` 카드
- DB 쓰기: Server Action + `SUPABASE_SERVICE_ROLE_KEY`
- 브라우저 Supabase: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (읽기 + Realtime만)
- 서버 시크릿(`TOSS_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`): `NEXT_PUBLIC_` 금지
- 최소 결제 금액: 1,000원
- 토스페이먼츠 테스트 모드 전용

---

## 파일 구조

```
신규 생성:
  middleware.ts
  app/login/page.tsx
  app/login/actions.ts
  app/register/page.tsx
  app/register/actions.ts
  app/funding/[token]/pay/page.tsx          (Server Component)
  app/funding/[token]/pay/PayClient.tsx     (Client Component)
  app/funding/[token]/pay/actions.ts
  app/funding/[token]/admin/page.tsx        (Server Component)
  app/funding/[token]/admin/AdminClient.tsx (Client Component)
  app/funding/[token]/admin/actions.ts
  app/api/payment/confirm/route.ts
  app/payment/success/page.tsx
  app/payment/success/SuccessClient.tsx
  app/payment/fail/page.tsx
  components/payment/AmountSelector.tsx
  types/kakao.d.ts

수정:
  lib/supabase/types.ts        — Funding: creator_email → creator_user_id
  app/create/actions.ts        — sendOtp/verifyOtp 제거, createFunding 수정
  app/create/page.tsx          — Step 1~2 OTP 단계 제거
```

---

### Task 1: DB 마이그레이션 & TypeScript 타입 수정

**Files:**
- Modify: `lib/supabase/types.ts`
- SQL: Supabase 대시보드에서 직접 실행

**Interfaces:**
- Produces: `Funding.creator_user_id: string` (Task 2 이후 모든 Task에서 사용)

- [ ] **Step 1: Supabase 대시보드 → SQL Editor에서 아래 SQL 실행**

```sql
-- creator_email 컬럼을 creator_user_id로 교체
ALTER TABLE fundings
  DROP COLUMN creator_email,
  ADD COLUMN creator_user_id uuid NOT NULL REFERENCES auth.users(id);

-- fundings: 본인 펀딩만 수정 가능 (RLS)
CREATE POLICY "fundings_update_owner" ON fundings
  FOR UPDATE USING (auth.uid() = creator_user_id);
```

> ⚠️ 기존 fundings 행이 없을 때만 실행 가능. 행이 있다면 `ADD COLUMN ... DEFAULT gen_random_uuid()` 후 수동 정리.

- [ ] **Step 2: Supabase 대시보드 → Authentication → Email 설정 확인**

Authentication → Providers → Email:
- "Enable Email Signup" ON
- "Confirm email" ON (회원가입 OTP 발송에 필요)

- [ ] **Step 3: `lib/supabase/types.ts` 수정**

```typescript
// lib/supabase/types.ts
export type Funding = {
  id: string
  creator_user_id: string          // ← creator_email에서 변경
  title: string
  description: string | null
  end_date: string
  share_token: string
  status: 'active' | 'closed'
  created_at: string
}

export type Gift = {
  id: string
  funding_id: string
  name: string
  target_amount: number
  description: string | null
  image_url: string | null
  created_at: string
}

export type Payment = {
  id: string
  funding_id: string
  participant_name: string
  message: string | null
  amount: number
  order_id: string
  payment_key: string | null
  status: 'pending' | 'confirmed' | 'failed'
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      fundings: {
        Row: Funding
        Insert: Omit<Funding, 'id' | 'created_at'>
        Update: Partial<Omit<Funding, 'id' | 'created_at'>>
      }
      gifts: {
        Row: Gift
        Insert: Omit<Gift, 'id' | 'created_at'>
        Update: Partial<Omit<Gift, 'id' | 'created_at'>>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at'>
        Update: Partial<Omit<Payment, 'id' | 'created_at'>>
      }
    }
  }
}
```

- [ ] **Step 4: TypeScript 컴파일 오류 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음 (creator_email을 참조하던 create/actions.ts가 있으면 Task 5에서 수정)

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat(db): creator_email → creator_user_id 마이그레이션 및 타입 수정"
```

---

### Task 2: 미들웨어 (세션 보호)

**Files:**
- Create: `middleware.ts`

**Interfaces:**
- Consumes: `@supabase/ssr` createServerClient, `NextRequest`
- Produces: `/create`, `/funding/[token]/admin` 경로에 세션 없으면 `/login?redirect=...` 리다이렉트

> ⚠️ 미들웨어는 `next/headers`를 사용할 수 없다. `lib/supabase/server.ts`의 헬퍼가 아닌 `@supabase/ssr` createServerClient를 직접 사용해야 한다.

- [ ] **Step 1: `middleware.ts` 작성**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected =
    pathname.startsWith('/create') ||
    /^\/funding\/[^/]+\/admin/.test(pathname)

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
```

- [ ] **Step 2: 개발 서버에서 미들웨어 동작 확인**

```bash
npm run dev
```

로그인 없이 `http://localhost:3000/create` 접속 → `/login?redirect=/create` 리다이렉트 확인 (404여도 리다이렉트만 확인)

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): 미들웨어 세션 보호 추가 (/create, /admin)"
```

---

### Task 3: 로그인 페이지

**Files:**
- Create: `app/login/actions.ts`
- Create: `app/login/page.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient` from `lib/supabase/server`
- Produces:
  - `signIn(email: string, password: string): Promise<{ success: true } | { error: string }>`
  - `signOut(): Promise<void>`

- [ ] **Step 1: `app/login/actions.ts` 작성**

```typescript
// app/login/actions.ts
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function signIn(email: string, password: string) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: '이메일 또는 비밀번호가 올바르지 않습니다' }
  return { success: true as const }
}

export async function signOut() {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()
}
```

- [ ] **Step 2: `app/login/page.tsx` 작성**

```tsx
// app/login/page.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { signIn } from './actions'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/create'

  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = () => {
    if (!email) return setError('이메일을 입력해주세요')
    if (!password) return setError('비밀번호를 입력해주세요')
    setError('')

    startTransition(async () => {
      const result = await signIn(email, password)
      if ('error' in result) return setError(result.error)
      router.push(redirectTo)
      router.refresh()
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm flex flex-col gap-5">
        <div className="text-center mb-2">
          <div className="text-4xl mb-2">🎂</div>
          <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
          <p className="text-sm text-gray-500 mt-1">모아모아에 오신 걸 환영해요</p>
        </div>

        <Input
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <Input
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 입력"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          error={error}
        />

        <Button onClick={handleLogin} disabled={isPending}>
          {isPending ? '로그인 중...' : '로그인'}
        </Button>

        <p className="text-center text-sm text-gray-400">
          아직 계정이 없으신가요?{' '}
          <Link href="/register" className="text-rose-500 font-semibold hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: 브라우저에서 수동 테스트**

1. `http://localhost:3000/login` 접속
2. 잘못된 비밀번호 → "이메일 또는 비밀번호가 올바르지 않습니다" 오류 확인
3. (계정이 없으면 Task 4 후 테스트) 올바른 이메일+비밀번호 → `/create` 리다이렉트 확인
4. `/create?redirect=/funding/xyz/admin` 경유 → 로그인 후 해당 경로로 리다이렉트 확인

- [ ] **Step 4: Commit**

```bash
git add app/login/
git commit -m "feat(auth): 로그인 페이지 및 signIn/signOut Server Action 구현"
```

---

### Task 4: 회원가입 페이지

**Files:**
- Create: `app/register/actions.ts`
- Create: `app/register/page.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient` from `lib/supabase/server`
- Produces:
  - `signUp(email: string, password: string): Promise<{ success: true } | { error: string }>`
  - `verifySignUpOtp(email: string, otp: string): Promise<{ success: true } | { error: string }>`

- [ ] **Step 1: `app/register/actions.ts` 작성**

```typescript
// app/register/actions.ts
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function signUp(email: string, password: string) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) {
    if (error.message.includes('already registered')) return { error: '이미 가입된 이메일입니다' }
    return { error: error.message }
  }
  return { success: true as const }
}

export async function verifySignUpOtp(email: string, otp: string) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'signup',
  })
  if (error) return { error: '인증 코드가 올바르지 않거나 만료되었습니다' }
  return { success: true as const }
}
```

- [ ] **Step 2: `app/register/page.tsx` 작성**

```tsx
// app/register/page.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { signUp, verifySignUpOtp } from './actions'

export default function RegisterPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')

  const handleSignUp = () => {
    if (!email) return setError('이메일을 입력해주세요')
    if (password.length < 6) return setError('비밀번호는 6자 이상이어야 해요')
    if (password !== passwordConfirm) return setError('비밀번호가 일치하지 않아요')
    setError('')

    startTransition(async () => {
      const result = await signUp(email, password)
      if ('error' in result) return setError(result.error)
      setStep(2)
    })
  }

  const handleVerifyOtp = () => {
    if (!otp) return setError('인증 코드를 입력해주세요')
    setError('')

    startTransition(async () => {
      const result = await verifySignUpOtp(email, otp)
      if ('error' in result) return setError(result.error)
      router.push('/create')
      router.refresh()
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm flex flex-col gap-5">
        <div className="text-center mb-2">
          <div className="text-4xl mb-2">🎂</div>
          <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 1 ? '이메일과 비밀번호를 입력해주세요' : `${email}로 전송된 인증 코드를 입력해주세요`}
          </p>
        </div>

        <div className="flex gap-2 mb-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${step >= s ? 'bg-rose-400' : 'bg-gray-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <Input
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
            />
            <Input
              label="비밀번호 확인"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 재입력"
              error={error}
            />
            <Button onClick={handleSignUp} disabled={isPending}>
              {isPending ? '처리 중...' : '인증 코드 받기'}
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <Input
              label="인증 코드 (6자리)"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              maxLength={6}
              error={error}
            />
            <Button onClick={handleVerifyOtp} disabled={isPending}>
              {isPending ? '확인 중...' : '가입 완료'}
            </Button>
            <button
              className="text-sm text-gray-400 hover:underline"
              onClick={() => { setStep(1); setError('') }}
            >
              이메일 다시 입력
            </button>
          </>
        )}

        <p className="text-center text-sm text-gray-400">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-rose-500 font-semibold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: 전체 회원가입 플로우 수동 테스트**

1. `http://localhost:3000/register` 접속
2. 비밀번호 6자 미만 → "비밀번호는 6자 이상이어야 해요" 오류 확인
3. 비밀번호 불일치 → "비밀번호가 일치하지 않아요" 오류 확인
4. 올바른 이메일+비밀번호 → "인증 코드 받기" 클릭 → Step 2 이동
5. 이메일 수신함에서 6자리 코드 확인 → 입력 → "가입 완료"
6. `/create` 리다이렉트 확인
7. Supabase 대시보드 → Authentication → Users에서 신규 계정 확인

- [ ] **Step 4: `/login`에서 방금 만든 계정으로 로그인 테스트**

1. `http://localhost:3000/login` 접속
2. 방금 가입한 이메일+비밀번호 입력
3. `/create` 리다이렉트 확인

- [ ] **Step 5: Commit**

```bash
git add app/register/
git commit -m "feat(auth): 회원가입 페이지 구현 (이메일+비밀번호 + OTP 인증)"
```

---

### Task 5: createFunding 수정 & Create 페이지 간소화

**Files:**
- Modify: `app/create/actions.ts`
- Modify: `app/create/page.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient`, `createServiceRoleClient` from `lib/supabase/server`
- Produces:
  - `createFunding(data: { title: string; description: string; endDate: string; gifts: GiftInput[] }): Promise<{ shareToken: string } | { error: string }>`

> `sendOtp`, `verifyOtp` 함수는 이 Task에서 삭제한다.

- [ ] **Step 1: `app/create/actions.ts` 전체 교체**

```typescript
// app/create/actions.ts
'use server'

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { generateShareToken } from '@/lib/utils'

type GiftInput = { name: string; targetAmount: number; description: string }

export async function createFunding(data: {
  title: string
  description: string
  endDate: string
  gifts: GiftInput[]
}) {
  if (data.gifts.length === 0) return { error: '선물을 1개 이상 추가해주세요' }

  const serverClient = createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const supabase = createServiceRoleClient()
  const shareToken = generateShareToken()

  const { data: funding, error: fundingError } = await supabase
    .from('fundings')
    .insert({
      creator_user_id: user.id,
      title: data.title,
      description: data.description,
      end_date: new Date(data.endDate).toISOString(),
      share_token: shareToken,
      status: 'active',
    })
    .select()
    .single()

  if (fundingError) return { error: fundingError.message }

  const { error: giftsError } = await supabase.from('gifts').insert(
    data.gifts.map((g) => ({
      funding_id: funding.id,
      name: g.name,
      target_amount: g.targetAmount,
      description: g.description,
    }))
  )

  if (giftsError) return { error: giftsError.message }

  return { shareToken }
}
```

- [ ] **Step 2: `app/create/page.tsx` 전체 교체**

```tsx
// app/create/page.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createFunding } from './actions'

type GiftInput = { name: string; targetAmount: string; description: string }

export default function CreatePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [endDate, setEndDate] = useState('')
  const [gifts, setGifts] = useState<GiftInput[]>([{ name: '', targetAmount: '', description: '' }])
  const [error, setError] = useState('')
  const [shareToken, setShareToken] = useState('')

  const addGift = () => setGifts([...gifts, { name: '', targetAmount: '', description: '' }])
  const removeGift = (idx: number) => setGifts(gifts.filter((_, i) => i !== idx))
  const updateGift = (idx: number, field: keyof GiftInput, value: string) => {
    setGifts(gifts.map((g, i) => (i === idx ? { ...g, [field]: value } : g)))
  }

  const handleCreateFunding = () => {
    if (!title) return setError('펀딩 제목을 입력해주세요')
    if (!endDate) return setError('마감일을 선택해주세요')
    if (gifts.some((g) => !g.name || !g.targetAmount)) return setError('선물 정보를 모두 입력해주세요')
    setError('')

    startTransition(async () => {
      const result = await createFunding({
        title,
        description,
        endDate,
        gifts: gifts.map((g) => ({
          name: g.name,
          targetAmount: parseInt(g.targetAmount.replace(/,/g, ''), 10),
          description: g.description,
        })),
      })
      if ('error' in result) return setError(result.error)
      setShareToken(result.shareToken)
    })
  }

  if (shareToken) {
    const shareUrl = `${window.location.origin}/funding/${shareToken}`
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm text-center flex flex-col gap-4">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold">펀딩이 만들어졌어요!</h1>
          <p className="text-gray-500 text-sm">아래 링크를 참여자들에게 공유하세요</p>
          <div className="bg-gray-100 rounded-xl p-4 break-all text-sm text-gray-700">{shareUrl}</div>
          <Button onClick={() => navigator.clipboard.writeText(shareUrl)}>링크 복사하기</Button>
          <button
            className="mt-1 text-sm text-rose-500 hover:underline"
            onClick={() => router.push(`/funding/${shareToken}`)}
          >
            펀딩 페이지 보러가기 →
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold mb-6">펀딩 만들기 🎂</h1>
        <div className="flex flex-col gap-5">
          <Input
            label="펀딩 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="지수 생일 선물 펀딩 🎂"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">설명 (선택)</label>
            <textarea
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="펀딩 소개를 적어주세요"
            />
          </div>
          <Input
            label="마감일"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">선물 목록</span>
              <button className="text-xs text-rose-500 hover:underline" onClick={addGift}>
                + 선물 추가
              </button>
            </div>
            {gifts.map((gift, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-600">선물 {idx + 1}</span>
                  {gifts.length > 1 && (
                    <button className="text-xs text-gray-400 hover:text-red-400" onClick={() => removeGift(idx)}>
                      삭제
                    </button>
                  )}
                </div>
                <Input
                  label="선물 이름"
                  value={gift.name}
                  onChange={(e) => updateGift(idx, 'name', e.target.value)}
                  placeholder="에어팟 프로"
                />
                <Input
                  label="목표 금액 (원)"
                  type="number"
                  value={gift.targetAmount}
                  onChange={(e) => updateGift(idx, 'targetAmount', e.target.value)}
                  placeholder="350000"
                  min={1000}
                />
                <Input
                  label="설명 (선택)"
                  value={gift.description}
                  onChange={(e) => updateGift(idx, 'description', e.target.value)}
                  placeholder="2세대 에어팟 프로"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={handleCreateFunding} disabled={isPending}>
            {isPending ? '생성 중...' : '펀딩 만들기 🎂'}
          </Button>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 4: 브라우저에서 전체 플로우 수동 테스트**

1. 로그아웃 상태에서 `http://localhost:3000/create` → `/login?redirect=/create` 리다이렉트 확인
2. 로그인 후 `/create` 접속 → OTP 단계 없이 바로 펀딩 폼 표시 확인
3. 펀딩 제목, 마감일, 선물 1개 입력 → "펀딩 만들기" 클릭
4. 공유 링크 화면 표시 확인
5. Supabase 대시보드 Table Editor에서 `fundings.creator_user_id` = 로그인 user.id 확인

- [ ] **Step 5: Commit**

```bash
git add app/create/
git commit -m "feat(create): OTP 제거, 세션 기반 createFunding 구현"
```

---

### Task 6: 결제 입력 페이지

**Files:**
- Create: `components/payment/AmountSelector.tsx`
- Create: `app/funding/[token]/pay/actions.ts`
- Create: `app/funding/[token]/pay/page.tsx`
- Create: `app/funding/[token]/pay/PayClient.tsx`

**Interfaces:**
- Consumes: `createServiceRoleClient` from `lib/supabase/server`
- Produces:
  - `AmountSelector` props: `{ value: number; onChange: (v: number) => void }`
  - `createPendingPayment(fundingId: string, participantName: string, message: string, amount: number): Promise<{ orderId: string } | { error: string }>`

- [ ] **Step 1: `components/payment/AmountSelector.tsx` 작성**

```tsx
// components/payment/AmountSelector.tsx
'use client'

const QUICK_AMOUNTS = [10000, 20000, 30000, 50000]

type Props = { value: number; onChange: (v: number) => void }

export default function AmountSelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-gray-700">금액 선택</label>
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
              value === a
                ? 'bg-rose-500 text-white border-rose-500'
                : 'border-gray-300 text-gray-700 hover:border-rose-300'
            }`}
          >
            {(a / 10000).toFixed(0)}만원
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
          placeholder="직접 입력 (최소 1,000원)"
          min={1000}
          value={value || ''}
          onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        />
        <span className="text-sm text-gray-500">원</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `app/funding/[token]/pay/actions.ts` 작성**

```typescript
// app/funding/[token]/pay/actions.ts
'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export async function createPendingPayment(
  fundingId: string,
  participantName: string,
  message: string,
  amount: number
) {
  if (amount < 1000) return { error: '최소 결제 금액은 1,000원입니다' }
  if (!participantName.trim()) return { error: '이름을 입력해주세요' }

  const supabase = createServiceRoleClient()
  const orderId = `moamoa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const { error } = await supabase.from('payments').insert({
    funding_id: fundingId,
    participant_name: participantName.trim(),
    message: message.trim() || null,
    amount,
    order_id: orderId,
    status: 'pending',
  })

  if (error) return { error: error.message }
  return { orderId }
}
```

- [ ] **Step 3: `app/funding/[token]/pay/page.tsx` 작성 (Server Component)**

```tsx
// app/funding/[token]/pay/page.tsx
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import PayClient from './PayClient'

export default async function PayPage({ params }: { params: { token: string } }) {
  const supabase = createServiceRoleClient()
  const { data: funding } = await supabase
    .from('fundings')
    .select('id, title, status')
    .eq('share_token', params.token)
    .single()

  if (!funding || funding.status === 'closed') notFound()

  return <PayClient fundingId={funding.id} fundingTitle={funding.title} token={params.token} />
}
```

- [ ] **Step 4: `app/funding/[token]/pay/PayClient.tsx` 작성**

```tsx
// app/funding/[token]/pay/PayClient.tsx
'use client'

import { useState, useTransition } from 'react'
import { loadTossPayments } from '@tosspayments/payment-sdk'
import AmountSelector from '@/components/payment/AmountSelector'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createPendingPayment } from './actions'

type Props = { fundingId: string; fundingTitle: string; token: string }

export default function PayClient({ fundingId, fundingTitle }: Props) {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState(0)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handlePay = () => {
    if (!amount || amount < 1000) return setError('최소 1,000원부터 결제 가능해요')
    if (!name.trim()) return setError('이름을 입력해주세요')
    setError('')

    startTransition(async () => {
      const result = await createPendingPayment(fundingId, name, message, amount)
      if ('error' in result) return setError(result.error)

      try {
        const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
        await tossPayments.requestPayment('카드', {
          amount,
          orderId: result.orderId,
          orderName: `${fundingTitle} 펀딩 참여`,
          successUrl: `${window.location.origin}/payment/success`,
          failUrl: `${window.location.origin}/payment/fail`,
          customerName: name,
        })
      } catch (e: unknown) {
        if (e instanceof Error && e.message !== 'User canceled payment.') {
          setError('결제 중 오류가 발생했습니다')
        }
      }
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-5">
        <h1 className="text-xl font-bold text-gray-900">선물하기 🎁</h1>

        <AmountSelector value={amount} onChange={setAmount} />

        <Input
          label="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">응원 메시지 (선택)</label>
          <textarea
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300 resize-none"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="생일 축하해! 🎂"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button onClick={handlePay} disabled={isPending}>
          {isPending ? '처리 중...' : '결제하기'}
        </Button>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: 브라우저에서 결제 입력 페이지 수동 테스트**

1. Task 5에서 만든 펀딩의 `/funding/[token]/pay` 접속
2. 빠른 선택 버튼 (1만/2만/3만/5만) 클릭 → 활성화 확인
3. "결제하기" 클릭 → 토스페이먼츠 테스트 결제창 열림 확인
4. 결제창 닫기 → 결제 취소 처리 확인 (오류 메시지 없음)

- [ ] **Step 6: Commit**

```bash
git add components/payment/AmountSelector.tsx app/funding/
git commit -m "feat(pay): 결제 입력 페이지 및 createPendingPayment 구현"
```

---

### Task 7: 결제 확인 API & 성공/실패 페이지

**Files:**
- Create: `app/api/payment/confirm/route.ts`
- Create: `app/payment/success/page.tsx`
- Create: `app/payment/success/SuccessClient.tsx`
- Create: `app/payment/fail/page.tsx`
- Create: `types/kakao.d.ts`

**Interfaces:**
- Consumes: `createServiceRoleClient` from `lib/supabase/server`
- Produces:
  - `POST /api/payment/confirm` body: `{ paymentKey: string, orderId: string, amount: number }` → `{ success: true }` or `{ error: string }`

- [ ] **Step 1: `types/kakao.d.ts` 작성**

```typescript
// types/kakao.d.ts
interface Window {
  Kakao: {
    isInitialized: () => boolean
    init: (key: string | undefined) => void
    Share: {
      sendDefault: (options: {
        objectType: string
        content: {
          title: string
          description: string
          link: { mobileWebUrl: string; webUrl: string }
        }
        buttons: { title: string; link: { mobileWebUrl: string; webUrl: string } }[]
      }) => void
    }
  }
}
```

- [ ] **Step 2: `app/api/payment/confirm/route.ts` 작성**

```typescript
// app/api/payment/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })

  const { paymentKey, orderId, amount } = body
  if (!paymentKey || !orderId || !amount) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data: payment, error: findError } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .single()

  if (findError || !payment) {
    return NextResponse.json({ error: '결제 정보를 찾을 수 없습니다' }, { status: 404 })
  }

  if (payment.amount !== Number(amount)) {
    return NextResponse.json({ error: '결제 금액이 일치하지 않습니다' }, { status: 400 })
  }

  const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
  })

  if (!tossResponse.ok) {
    const tossError = await tossResponse.json().catch(() => ({}))
    await supabase.from('payments').update({ status: 'failed' }).eq('order_id', orderId)
    return NextResponse.json(
      { error: tossError.message || '토스페이먼츠 확인 실패' },
      { status: 400 }
    )
  }

  await supabase
    .from('payments')
    .update({ status: 'confirmed', payment_key: paymentKey })
    .eq('order_id', orderId)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: `app/payment/success/SuccessClient.tsx` 작성**

```tsx
// app/payment/success/SuccessClient.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

type Props = {
  paymentKey: string
  orderId: string
  amount: number
  fundingToken: string
  fundingTitle: string
  participantName: string
  totalAmount: number
  totalTarget: number
}

export default function SuccessClient(props: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [showKakao, setShowKakao] = useState(false)

  useEffect(() => {
    fetch('/api/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentKey: props.paymentKey,
        orderId: props.orderId,
        amount: props.amount,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setConfirmed(true)
          setShowKakao(true)
        } else {
          setError(data.error || '결제 확인 실패')
        }
      })
      .catch(() => setError('네트워크 오류가 발생했습니다'))
  }, [props.paymentKey, props.orderId, props.amount])

  const handleKakaoShare = () => {
    const percent =
      props.totalTarget > 0
        ? Math.min(Math.round(((props.totalAmount + props.amount) / props.totalTarget) * 100), 100)
        : 0
    const url = `${window.location.origin}/funding/${props.fundingToken}`

    window.Kakao?.Share?.sendDefault({
      objectType: 'feed',
      content: {
        title: `${props.participantName}님이 펀딩에 참여했어요! 🎂`,
        description: `${props.fundingTitle} — 현재 ${percent}% 달성`,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [{ title: '펀딩 보러가기', link: { mobileWebUrl: url, webUrl: url } }],
    })
    setShowKakao(false)
  }

  if (error) {
    return (
      <div className="text-center flex flex-col gap-4">
        <p className="text-red-500">{error}</p>
        <Link href={`/funding/${props.fundingToken}`}>
          <Button variant="outline">펀딩 페이지로 돌아가기</Button>
        </Link>
      </div>
    )
  }

  if (!confirmed) {
    return <p className="text-gray-500 text-center animate-pulse">결제 확인 중...</p>
  }

  return (
    <div className="text-center flex flex-col gap-4">
      <div className="text-5xl">🎉</div>
      <h1 className="text-2xl font-bold">결제가 완료됐어요!</h1>
      <p className="text-gray-500 text-sm">소중한 마음이 전달되었습니다</p>

      {showKakao && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-yellow-800">주최자에게 알릴까요? 😊</p>
          <button
            className="bg-[#FEE500] text-[#3C1E1E] font-semibold py-2 px-4 rounded-lg text-sm hover:bg-yellow-400 transition-colors"
            onClick={handleKakaoShare}
          >
            카카오톡으로 알리기
          </button>
          <button
            className="text-xs text-gray-400 hover:underline"
            onClick={() => setShowKakao(false)}
          >
            괜찮아요, 그냥 넘어갈게요
          </button>
        </div>
      )}

      <Link href={`/funding/${props.fundingToken}`}>
        <Button>펀딩 현황 보러가기</Button>
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: `app/payment/success/page.tsx` 작성**

```tsx
// app/payment/success/page.tsx
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import SuccessClient from './SuccessClient'

type SearchParams = { paymentKey?: string; orderId?: string; amount?: string }

export default async function SuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const { paymentKey, orderId, amount } = searchParams
  if (!paymentKey || !orderId || !amount) notFound()

  const supabase = createServiceRoleClient()

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .single()

  if (!payment) notFound()

  const { data: funding } = await supabase
    .from('fundings')
    .select('id, title, share_token')
    .eq('id', payment.funding_id)
    .single()

  if (!funding) notFound()

  const { data: confirmedPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('funding_id', funding.id)
    .eq('status', 'confirmed')

  const { data: gifts } = await supabase
    .from('gifts')
    .select('target_amount')
    .eq('funding_id', funding.id)

  const totalAmount = (confirmedPayments ?? []).reduce((s, p) => s + p.amount, 0)
  const totalTarget = (gifts ?? []).reduce((s, g) => s + g.target_amount, 0)

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm">
        <SuccessClient
          paymentKey={paymentKey}
          orderId={orderId}
          amount={Number(amount)}
          fundingToken={funding.share_token}
          fundingTitle={funding.title}
          participantName={payment.participant_name}
          totalAmount={totalAmount}
          totalTarget={totalTarget}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 5: `app/payment/fail/page.tsx` 작성**

```tsx
// app/payment/fail/page.tsx
'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function FailPage({
  searchParams,
}: {
  searchParams: { message?: string; code?: string }
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="text-center w-full max-w-md bg-white rounded-2xl p-8 shadow-sm flex flex-col gap-4">
        <div className="text-5xl">😢</div>
        <h1 className="text-2xl font-bold text-gray-900">결제에 실패했어요</h1>
        <p className="text-sm text-gray-500">{searchParams.message || '알 수 없는 오류가 발생했습니다'}</p>
        <button
          className="text-sm text-rose-500 hover:underline"
          onClick={() => window.history.back()}
        >
          다시 시도하기
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 6: 카카오 앱 도메인 설정**

Kakao Developers → 앱 설정 → 플랫폼 → Web → 사이트 도메인에 `http://localhost:3000` 추가.

- [ ] **Step 7: 전체 결제 플로우 수동 테스트**

1. `/funding/[token]/pay` → 금액 입력 → "결제하기"
2. 토스페이먼츠 테스트 결제창 → 카드번호 `4242 4242 4242 4242`, 만료 `12/25`, CVC `123`
3. 결제 완료 → `/payment/success?paymentKey=...&orderId=...&amount=...` 리다이렉트
4. "결제 확인 중..." → "결제가 완료됐어요!" 표시 확인
5. Supabase 대시보드 `payments.status = 'confirmed'` 확인
6. 펀딩 페이지로 돌아가 Realtime 업데이트(달성률, 후원자 목록) 확인
7. "카카오톡으로 알리기" 팝업 → 버튼 클릭 시 카카오 공유 시트 열림 확인

- [ ] **Step 8: Commit**

```bash
git add app/api/ app/payment/ types/
git commit -m "feat(payment): 결제 확인 API, 성공/실패 페이지, 카카오 공유 구현"
```

---

### Task 8: 어드민 페이지 & 정산

**Files:**
- Create: `app/funding/[token]/admin/page.tsx`
- Create: `app/funding/[token]/admin/AdminClient.tsx`
- Create: `app/funding/[token]/admin/actions.ts`

**Interfaces:**
- Consumes:
  - `createServerSupabaseClient`, `createServiceRoleClient` from `lib/supabase/server`
  - `Funding`, `Payment` from `lib/supabase/types`
  - `formatKRW` from `lib/utils`
- Produces:
  - `requestSettlement(fundingId: string): Promise<{ success: true } | { error: string }>`

- [ ] **Step 1: `app/funding/[token]/admin/actions.ts` 작성**

```typescript
// app/funding/[token]/admin/actions.ts
'use server'

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function requestSettlement(fundingId: string) {
  const serverClient = createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const supabase = createServiceRoleClient()

  const { data: funding } = await supabase
    .from('fundings')
    .select('creator_user_id, status')
    .eq('id', fundingId)
    .single()

  if (!funding || funding.creator_user_id !== user.id) return { error: '권한이 없습니다' }
  if (funding.status === 'closed') return { error: '이미 정산된 펀딩입니다' }

  const { error } = await supabase
    .from('fundings')
    .update({ status: 'closed' })
    .eq('id', fundingId)

  if (error) return { error: error.message }
  return { success: true as const }
}
```

- [ ] **Step 2: `app/funding/[token]/admin/AdminClient.tsx` 작성**

```tsx
// app/funding/[token]/admin/AdminClient.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { formatKRW } from '@/lib/utils'
import { requestSettlement } from './actions'
import type { Funding, Payment } from '@/lib/supabase/types'
import { signOut } from '@/app/login/actions'

type Props = {
  funding: Funding
  payments: Payment[]
  totalAmount: number
}

export default function AdminClient({ funding, payments, totalAmount }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [settled, setSettled] = useState(funding.status === 'closed')
  const [error, setError] = useState('')

  const handleSettle = () => {
    setError('')
    startTransition(async () => {
      const result = await requestSettlement(funding.id)
      if ('error' in result) return setError(result.error)
      setSettled(true)
    })
  }

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
      router.push('/')
    })
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-md mx-auto px-4 pt-8 flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">관리자 페이지</h1>
          <button
            className="text-sm text-gray-400 hover:underline"
            onClick={handleSignOut}
            disabled={isPending}
          >
            로그아웃
          </button>
        </div>

        <div>
          <p className="text-lg font-semibold text-gray-700">{funding.title}</p>
          {funding.description && (
            <p className="text-sm text-gray-400 mt-0.5">{funding.description}</p>
          )}
        </div>

        <div className="bg-rose-50 rounded-2xl p-5">
          <p className="text-sm text-gray-500 mb-1">총 모인 금액</p>
          <p className="text-3xl font-bold text-rose-500">{formatKRW(totalAmount)}</p>
          <p className="text-xs text-gray-400 mt-1">{payments.length}명 참여</p>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-700">결제 내역</h2>
          {payments.length === 0 && (
            <div className="bg-white rounded-2xl p-4 text-center text-sm text-gray-400">
              아직 결제 내역이 없어요
            </div>
          )}
          {payments.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-start"
            >
              <div>
                <p className="font-semibold text-sm text-gray-900">{p.participant_name}</p>
                {p.message && <p className="text-xs text-gray-400 mt-0.5">"{p.message}"</p>}
                <p className="text-xs text-gray-300 mt-0.5">
                  {new Date(p.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <span className="text-sm font-semibold text-rose-500 ml-2">{formatKRW(p.amount)}</span>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {settled ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-700 text-sm font-semibold">
            ✅ 정산이 완료되었습니다
          </div>
        ) : (
          <Button onClick={handleSettle} disabled={isPending}>
            {isPending ? '정산 중...' : '정산 요청하기'}
          </Button>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: `app/funding/[token]/admin/page.tsx` 작성**

```tsx
// app/funding/[token]/admin/page.tsx
import { notFound } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'

export default async function AdminPage({ params }: { params: { token: string } }) {
  const serverClient = createServerSupabaseClient()
  const { data: { user } } = await serverClient.auth.getUser()

  // 미들웨어가 처리하지만 이중 방어
  if (!user) notFound()

  const supabase = createServiceRoleClient()

  const { data: funding } = await supabase
    .from('fundings')
    .select('*')
    .eq('share_token', params.token)
    .single()

  // 펀딩 없거나 본인 펀딩이 아니면 404
  if (!funding || funding.creator_user_id !== user.id) notFound()

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('funding_id', funding.id)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })

  const totalAmount = (payments ?? []).reduce((sum, p) => sum + p.amount, 0)

  return (
    <AdminClient
      funding={funding}
      payments={payments ?? []}
      totalAmount={totalAmount}
    />
  )
}
```

- [ ] **Step 4: 어드민 접근 제어 수동 테스트**

1. 로그아웃 상태에서 `/funding/[token]/admin` 접속 → `/login?redirect=...` 리다이렉트 확인
2. 다른 계정으로 로그인 후 접속 → 404 확인
3. 펀딩 주최자 계정으로 로그인 후 접속 → 관리자 화면 표시 확인
4. 결제 내역 목록 및 총액 확인
5. "정산 요청하기" 클릭 → "정산이 완료되었습니다" 표시 확인
6. Supabase 대시보드 `fundings.status = 'closed'` 확인
7. 공개 펀딩 페이지에서 "이 펀딩은 마감되었습니다" 표시 확인
8. 로그아웃 버튼 → `/` 리다이렉트 확인

- [ ] **Step 5: TypeScript 컴파일 최종 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 6: Commit**

```bash
git add app/funding/
git commit -m "feat(admin): 세션 기반 주최자 관리 페이지 및 정산 기능 구현"
```

---

## 셀프 리뷰 체크리스트

| 스펙 요구사항 | Task |
|---|---|
| 회원가입 (이메일+비밀번호, OTP 1회) | Task 4 |
| 로그인 (이메일+비밀번호, 세션 유지) | Task 3 |
| `/create`, `/admin` 세션 보호 미들웨어 | Task 2 |
| `fundings.creator_user_id` (creator_email 대체) | Task 1 |
| createFunding에서 session.user.id 사용 | Task 5 |
| create 페이지 OTP 단계 제거 | Task 5 |
| 결제 입력 (자유 금액 + 빠른 선택) | Task 6 |
| 토스페이먼츠 테스트 결제 | Task 6 |
| 서버사이드 결제 검증 (amount 일치) | Task 7 |
| 카카오 공유 알림 | Task 7 |
| 어드민 세션 기반 접근 제어 | Task 8 |
| 어드민 OTP 재인증 제거 | Task 8 |
| 정산 요청 (테스트 모드: status=closed) | Task 8 |
| 로그아웃 버튼 | Task 8 |
| TDS 스타일 전체 적용 | Task 3, 4, 5, 6, 7, 8 |
| 카카오 소셜 로그인 | 추후 구현 (Task E — 미포함) |
