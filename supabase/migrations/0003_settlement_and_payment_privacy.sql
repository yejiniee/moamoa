-- 보안 수정: 정산 계좌 PII 분리 + 결제 내부식별자 노출 차단
-- Supabase SQL Editor에서 순서대로 실행하세요.
--
-- 배경(취약점):
--  [#1] fundings 테이블의 SELECT 정책이 using(true)이고 anon에 grant가 있어,
--       같은 테이블에 있던 정산 계좌(예금주/계좌번호)가 누구에게나 노출되었다.
--       RLS는 '행' 단위만 막고 '열(컬럼)'은 막지 못한다.
--  [#2] payments SELECT 정책이 사실상 status='confirmed'면 전부 열람 가능해,
--       payment_key/order_id 같은 내부 식별자까지 누구나 조회할 수 있었다.

-- ============================================================
-- [#1] 정산 계좌를 소유자 전용 테이블(settlements)로 분리
-- ============================================================

create table if not exists settlements (
  funding_id     uuid primary key references fundings(id) on delete cascade,
  bank_name      text not null,
  account_number text not null,
  account_holder text not null,
  created_at     timestamptz not null default now()
);

alter table settlements enable row level security;

-- 조회: 해당 펀딩의 생성자(소유자)만. (쓰기 정책 없음 → service_role만 가능)
create policy "settlements_select_owner"
  on settlements for select
  using (
    exists (
      select 1 from fundings f
      where f.id = settlements.funding_id
        and f.creator_user_id = auth.uid()
    )
  );

-- 기존 데이터가 있으면 이전(개발 단계라면 없을 수 있음)
insert into settlements (funding_id, bank_name, account_number, account_holder)
select id, settle_bank_name, settle_account_number, settle_account_holder
from fundings
where settle_account_number is not null
on conflict (funding_id) do nothing;

-- fundings에서 민감 계좌 컬럼 제거
-- (settled_at, settled_amount는 민감정보가 아니라 유지 — 화면 표시용)
alter table fundings drop column if exists settle_bank_name;
alter table fundings drop column if exists settle_account_number;
alter table fundings drop column if exists settle_account_holder;

-- anon은 아예 접근 불가, authenticated는 위 RLS(소유자)만 통과
grant select on public.settlements to authenticated;

-- ============================================================
-- [#2] payments 내부 식별자(payment_key, order_id) 클라이언트 노출 차단
--      컬럼 단위 GRANT로 안전한 컬럼만 노출한다.
--      (service_role은 GRANT/RLS를 우회하므로 서버 코드는 영향 없음)
-- ============================================================

revoke select on public.payments from anon, authenticated;

grant select
  (id, funding_id, participant_name, message, amount, status, created_at)
  on public.payments to anon, authenticated;

-- 주의: Supabase Realtime은 컬럼 GRANT를 우회해 전체 행을 방송할 수 있다.
-- payment_key/order_id는 그 자체로는 인증 수단이 아니지만, 완전 차단이 필요하면
-- 향후 별도 비공개 테이블로 분리하는 것을 권장한다.
