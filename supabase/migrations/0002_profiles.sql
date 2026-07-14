-- 사용자별 기본 계좌 저장용 profiles 테이블
-- Supabase SQL Editor에서 실행하세요.

create table if not exists profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  bank_name      text,
  account_number text,
  account_holder text,
  updated_at     timestamptz not null default now()
);

alter table profiles enable row level security;

-- 본인 행만 접근 가능
create policy "profiles_select_own" on profiles for select
  using (auth.uid() = user_id);
create policy "profiles_insert_own" on profiles for insert
  with check (auth.uid() = user_id);
create policy "profiles_update_own" on profiles for update
  using (auth.uid() = user_id);

grant select, insert, update on public.profiles to authenticated;
