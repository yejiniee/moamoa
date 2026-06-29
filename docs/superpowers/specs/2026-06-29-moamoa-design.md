# MoaMoa 설계 문서

**생성일:** 2026-06-29  
**프로젝트:** 생일선물 펀딩 웹서비스  
**범위:** MVP (개발/테스트 모드)

---

## 개요

생일자의 지인이 펀딩을 생성하고, 공유 링크를 통해 참여자들이 토스페이먼츠로 결제하면 모인 금액이 주최자 계좌로 정산되는 웹서비스. 참여자는 로그인 없이 링크만으로 결제 가능.

---

## 기술 스택

- **Frontend/Backend:** Next.js 14 (App Router)
- **DB/Auth/Realtime:** Supabase (PostgreSQL + Email OTP + Realtime)
- **결제:** 토스페이먼츠 테스트 모드
- **카카오 알림:** 카카오 공유 SDK (무료)

---

## 아키텍처

```
[브라우저]
   │
   ├── Next.js 14 (App Router)
   │    ├── Server Components  → Supabase 데이터 fetch
   │    ├── Server Actions     → 펀딩 생성, 이메일 인증, 정산 요청
   │    ├── /api/payment/confirm  → 토스페이먼츠 결제 서버 검증 (POST)
   │    └── Client Components  → Supabase Realtime 구독, 결제 버튼
   │
   ├── Supabase
   │    ├── PostgreSQL DB      → 펀딩/선물/결제 데이터
   │    ├── Auth (Email OTP)   → 주최자 이메일 인증 (매직링크)
   │    └── Realtime           → 결제 발생 시 펀딩 현황 자동 갱신
   │
   └── 토스페이먼츠 (테스트 모드)
        ├── 결제창 호출        → 참여자 카드 결제
        ├── 결제 검증 API      → /api/payment/confirm 서버 검증
        └── 정산 API           → 주최자 계좌 입금 (테스트)
```

**인증 전략:** 주최자만 이메일 OTP 인증. 참여자는 인증 없이 `share_token` 기반 공유 링크로 접근.

---

## 데이터 모델

```sql
-- 펀딩
fundings
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  creator_email text NOT NULL
  title         text NOT NULL        -- "지수 생일 선물 펀딩"
  description   text
  end_date      timestamptz NOT NULL
  share_token   text UNIQUE NOT NULL  -- 랜덤 8자, 공유 링크용
  status        text DEFAULT 'active' CHECK (status IN ('active', 'closed'))
  created_at    timestamptz DEFAULT now()

-- 선물 목록 (펀딩당 여러 개)
gifts
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  funding_id    uuid REFERENCES fundings(id) ON DELETE CASCADE
  name          text NOT NULL        -- "에어팟 프로"
  target_amount integer NOT NULL     -- 350000 (원 단위)
  description   text
  image_url     text
  created_at    timestamptz DEFAULT now()

-- 결제 내역
payments
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  funding_id        uuid REFERENCES fundings(id)
  participant_name  text NOT NULL
  message           text
  amount            integer NOT NULL
  order_id          text UNIQUE NOT NULL   -- 토스페이먼츠 주문번호
  payment_key       text                   -- 토스페이먼츠 결제키
  status            text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed'))
  created_at        timestamptz DEFAULT now()
```

**집계 전략:** `total_amount`, 달성률은 컬럼으로 저장하지 않음. `payments` 테이블의 `confirmed` 건을 실시간 합산. Supabase Realtime은 `payments` 테이블 하나만 구독.

**전체 목표 금액:** `gifts.target_amount`의 합산. 각 선물의 달성률은 `payments` 건을 선물 단위로 나누지 않고, 전체 모인 금액 대비 각 선물 목표 금액으로 단순 표시 (참여자가 특정 선물을 지정하지 않으므로).

**보안:** Supabase Row Level Security(RLS) 활성화. `payments` 테이블은 insert만 허용(anon), select는 같은 funding_id만. `fundings`/`gifts`는 read 허용, write는 service role만.

---

## 페이지 구조

```
/                              랜딩 페이지 ("펀딩 만들기" CTA)

/create                        펀딩 생성 (주최자)
  Step 1: 이메일 입력 → OTP 발송
  Step 2: OTP 코드 입력 → 인증
  Step 3: 펀딩 정보 입력
          - 제목, 설명, 마감일
          - 선물 추가 (이름, 목표 금액, 설명) - 여러 개 가능
  완료: 공유 링크 표시 + 복사 버튼

/funding/[token]               펀딩 공유 페이지 (참여자, 로그인 불필요)
  - 펀딩 제목, 설명, 마감 D-day
  - 전체 달성률 (모인 금액 / 전체 목표 금액)
  - 선물 목록 + 각 선물별 달성률 바
  - 후원자 목록 (이름 + 메시지)
  - Supabase Realtime 실시간 갱신
  - "선물하기" 버튼

/funding/[token]/pay           결제 입력 페이지
  - 빠른 금액 선택 (1만 / 2만 / 3만 / 5만원)
  - 직접 입력 (1,000원 이상)
  - 이름, 응원 메시지
  - "결제하기" → 토스페이먼츠 결제창

/payment/success               결제 완료 (토스 리다이렉트)
  - /api/payment/confirm 호출 → 검증
  - "카카오로 주최자에게 알리기" 팝업 (선택)
  - 카카오 공유 메시지: "OO님이 [펀딩명]에 참여했어요! 현재 XX% 달성"

/payment/fail                  결제 실패 (토스 리다이렉트)

/funding/[token]/admin         주최자 관리 페이지
  - 이메일 OTP 재인증 후 접근
  - 결제 내역 목록
  - 총 모인 금액
  - "정산 요청" 버튼 → 토스페이먼츠 정산 API (테스트)
```

---

## 핵심 플로우

### 펀딩 생성

```
이메일 입력
  → Supabase OTP 발송 (Server Action)
  → OTP 인증 성공
  → 펀딩 정보 + 선물 입력
  → Server Action: fundings + gifts INSERT
  → share_token 생성 (nanoid 8자)
  → 공유 링크 표시: /funding/[token]
```

### 참여자 결제

```
/funding/[token] 접속 (Server Component: 초기 데이터 fetch)
  → 현황 확인 (Realtime 구독 시작)
  → "선물하기" 클릭
  → /funding/[token]/pay: 금액 + 이름 + 메시지 입력
  → Server Action: payments INSERT (status=pending, order_id 생성)
  → 토스페이먼츠 결제창 호출
  → 결제 완료 → /payment/success?orderId=...&paymentKey=...&amount=...
      (Server Component: searchParams로 쿼리 파라미터 읽음)
      - 서버에서 토스페이먼츠 confirm API 직접 호출 (시크릿 키)
      - 응답 amount == payments.amount 일치 검증
      - payments UPDATE: status=confirmed, payment_key 저장
  → Supabase Realtime 이벤트 → 모든 구독자 화면 자동 갱신
  → "카카오로 알리기?" 팝업
      - 수락: 카카오 공유 SDK → 카카오톡 앱에서 수신자 선택 후 전송
      - 거절: 그냥 닫기
```

### 주최자 정산

```
/funding/[token]/admin 접속
  → 이메일 OTP 재인증
      - 입력한 이메일 == fundings.creator_email 일치 검증 필수
      - 불일치 시 접근 차단
  → 결제 내역 + 총액 확인
  → "정산 요청" 클릭
  → Server Action: 토스페이먼츠 정산 API 호출 (테스트 모드)
  → fundings UPDATE: status=closed
```

---

## Realtime 구조

```
payments 테이블 INSERT/UPDATE (status → confirmed)
  → Supabase Realtime postgres_changes 이벤트
  → 클라이언트: confirmed 건 합산 재계산
  → 달성률 바, 총액, 후원자 목록 즉시 갱신
```

Realtime 구독은 `payments` 테이블의 `funding_id = [token의 펀딩 ID]` 필터로 해당 펀딩 건만 수신.

---

## 환경변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # 서버 전용 (결제 검증 시 사용)

# 토스페이먼츠 (테스트 모드)
NEXT_PUBLIC_TOSS_CLIENT_KEY=     # test_ck_...
TOSS_SECRET_KEY=                 # test_sk_... (서버 전용)

# 카카오
NEXT_PUBLIC_KAKAO_JS_KEY=        # 카카오 JavaScript 앱 키
```

---

## 정산 관련 참고

- 테스트 모드에서는 실제 돈이 이동하지 않음
- 목표 금액 미달성 시에도 환불 없이 주최자에게 정산 (정책 결정)
- 실서비스 전환 시: 토스페이먼츠 사업자 심사 + 정산 수수료(카드 약 3.3%) 발생
