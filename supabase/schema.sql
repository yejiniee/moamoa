-- MoaMoa 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요.

-- ============================================================
-- 테이블 생성
-- ============================================================

create table if not exists fundings (
  id            uuid primary key default gen_random_uuid(),
  creator_email text not null,
  title         text not null,
  description   text,
  end_date      timestamptz not null,
  share_token   text unique not null,
  status        text not null default 'active' check (status in ('active', 'closed')),
  created_at    timestamptz not null default now()
);

create table if not exists gifts (
  id            uuid primary key default gen_random_uuid(),
  funding_id    uuid not null references fundings(id) on delete cascade,
  name          text not null,
  target_amount integer not null,
  description   text,
  image_url     text,
  created_at    timestamptz not null default now()
);

create table if not exists payments (
  id               uuid primary key default gen_random_uuid(),
  funding_id       uuid not null references fundings(id),
  participant_name text not null,
  message          text,
  amount           integer not null,
  order_id         text unique not null,
  payment_key      text,
  status           text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  created_at       timestamptz not null default now()
);

-- ============================================================
-- Row Level Security 활성화
-- ============================================================

alter table fundings  enable row level security;
alter table gifts     enable row level security;
alter table payments  enable row level security;

-- ============================================================
-- RLS 정책 — fundings
-- ============================================================

-- 누구나 조회 가능 (공유 링크로 접근하는 참여자 포함)
create policy "fundings_select_public"
  on fundings for select
  using (true);

-- 생성/수정/삭제는 service_role만 (Server Action에서 service_role 클라이언트 사용)
create policy "fundings_insert_service"
  on fundings for insert
  with check (auth.role() = 'service_role');

create policy "fundings_update_service"
  on fundings for update
  using (auth.role() = 'service_role');

-- ============================================================
-- RLS 정책 — gifts
-- ============================================================

create policy "gifts_select_public"
  on gifts for select
  using (true);

create policy "gifts_insert_service"
  on gifts for insert
  with check (auth.role() = 'service_role');

create policy "gifts_update_service"
  on gifts for update
  using (auth.role() = 'service_role');

-- ============================================================
-- RLS 정책 — payments
-- ============================================================

-- 같은 funding_id의 confirmed 결제만 조회 가능 (후원자 목록 표시)
create policy "payments_select_same_funding"
  on payments for select
  using (status = 'confirmed');

-- anon 사용자도 결제 INSERT 가능 (참여자 로그인 불필요)
create policy "payments_insert_anon"
  on payments for insert
  with check (true);

-- 결제 상태 업데이트는 service_role만 (결제 검증 API)
create policy "payments_update_service"
  on payments for update
  using (auth.role() = 'service_role');

-- ============================================================
-- 인덱스
-- ============================================================

create index if not exists idx_fundings_share_token on fundings(share_token);
create index if not exists idx_gifts_funding_id     on gifts(funding_id);
create index if not exists idx_payments_funding_id  on payments(funding_id);
create index if not exists idx_payments_order_id    on payments(order_id);
